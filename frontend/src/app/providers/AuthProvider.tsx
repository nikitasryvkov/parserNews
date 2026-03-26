import Keycloak from 'keycloak-js';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { fetchAuthConfig, fetchCurrentUser } from '../../entities/auth/api/authApi';
import { hasPermission, hasRole } from '../../entities/auth/model/access';
import type {
  AppPermission,
  AppRole,
  AuthConfigResponse,
  AuthProvider as AuthProviderName,
  AuthUser,
} from '../../entities/auth/model/types';
import { clearAccessToken, setAccessToken } from '../../shared/lib/auth/accessTokenStore';
import { confirmAction, promptText } from '../../shared/lib/browser/dialogs';
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from '../../shared/lib/storage/apiKeyStorage';
import { useToast } from './ToastProvider';

type AuthStatus = 'loading' | 'ready';

export interface AuthContextValue {
  status: AuthStatus;
  config: AuthConfigResponse | null;
  provider: AuthProviderName | null;
  authRequired: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  error: string;
  apiKeyConfigured: boolean;
  sessionVersion: number;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  promptForApiKey: () => Promise<void>;
  clearStoredApiKey: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (permission: AppPermission) => boolean;
  reloadAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    realmRoles: normalizeStringArray(user.realmRoles),
    clientRoles: normalizeStringArray(user.clientRoles),
    appRoles: normalizeStringArray(user.appRoles) as AppRole[],
    permissions: normalizeStringArray(user.permissions) as AppPermission[],
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { pushToast } = useToast();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [config, setConfig] = useState<AuthConfigResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(hasApiKey());
  const [sessionVersion, setSessionVersion] = useState(0);
  const keycloakRef = useRef<Keycloak | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  function bumpSessionVersion() {
    setSessionVersion((current) => current + 1);
  }

  function clearRefreshLoop() {
    if (refreshTimerRef.current !== null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  function syncUser(nextUser: AuthUser | null) {
    if (!isMountedRef.current) return;
    setUser(nextUser);
    bumpSessionVersion();
  }

  function syncError(nextError: string) {
    if (!isMountedRef.current) return;
    setError(nextError);
  }

  async function hydrateCurrentUser(fallbackErrorMessage: string): Promise<AuthUser | null> {
    const response = await fetchCurrentUser();
    const normalizedUser = normalizeAuthUser(response.user);

    if (!isMountedRef.current) {
      return normalizedUser;
    }

    setUser(normalizedUser);
    setError('');
    return normalizedUser;
  }

  async function initializeApiKeySession(nextConfig: AuthConfigResponse): Promise<void> {
    const storedApiKey = getApiKey();
    const isConfigured = hasApiKey();

    setApiKeyConfigured(isConfigured);

    if (nextConfig.authRequired && !isConfigured) {
      clearAccessToken();
      syncUser(null);
      syncError('');
      return;
    }

    setAccessToken(storedApiKey);

    try {
      await hydrateCurrentUser('Не удалось загрузить профиль');
      bumpSessionVersion();
    } catch (authError) {
      clearAccessToken();
      syncUser(null);
      syncError(authError instanceof Error ? authError.message : 'Не удалось проверить API key');
    }
  }

  function startKeycloakRefreshLoop() {
    clearRefreshLoop();

    refreshTimerRef.current = window.setInterval(() => {
      const instance = keycloakRef.current;

      if (!instance?.authenticated) {
        return;
      }

      void instance
        .updateToken(60)
        .then(() => {
          if (instance.token) {
            setAccessToken(instance.token);
          }
        })
        .catch(() => {
          instance.clearToken();
          clearRefreshLoop();
          clearAccessToken();
          syncUser(null);
          syncError('Сессия истекла. Войдите снова.');
        });
    }, 30_000);
  }

  async function initializeKeycloakSession(nextConfig: AuthConfigResponse): Promise<void> {
    if (!nextConfig.keycloak) {
      throw new Error('Keycloak public configuration is missing');
    }

    const instance = new Keycloak({
      url: nextConfig.keycloak.url,
      realm: nextConfig.keycloak.realm,
      clientId: nextConfig.keycloak.clientId,
    });

    keycloakRef.current = instance;

    const authenticated = await instance.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      flow: 'standard',
      responseMode: 'query',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });

    if (!authenticated || !instance.token) {
      clearAccessToken();
      syncUser(null);
      syncError('');
      return;
    }

    setAccessToken(instance.token);
    startKeycloakRefreshLoop();

    try {
      await hydrateCurrentUser('Не удалось загрузить профиль Keycloak');
      bumpSessionVersion();
    } catch (authError) {
      clearAccessToken();
      instance.clearToken();
      clearRefreshLoop();
      syncUser(null);
      syncError(authError instanceof Error ? authError.message : 'Не удалось проверить сессию Keycloak');
    }
  }

  async function initializeAuth(): Promise<void> {
    clearRefreshLoop();
    keycloakRef.current = null;
    clearAccessToken();

    if (isMountedRef.current) {
      setStatus('loading');
      setError('');
    }

    try {
      const nextConfig = await fetchAuthConfig();

      if (!isMountedRef.current) {
        return;
      }

      setConfig(nextConfig);

      if (nextConfig.provider === 'keycloak') {
        await initializeKeycloakSession(nextConfig);
      } else {
        await initializeApiKeySession(nextConfig);
      }
    } catch (initError) {
      clearAccessToken();
      syncUser(null);
      syncError(initError instanceof Error ? initError.message : 'Не удалось инициализировать авторизацию');
    } finally {
      if (isMountedRef.current) {
        setStatus('ready');
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    void initializeAuth();

    return () => {
      isMountedRef.current = false;
      clearRefreshLoop();
      clearAccessToken();
    };
  }, []);

  async function refreshProfile(): Promise<void> {
    if (!config) {
      return;
    }

    if (config.provider === 'keycloak') {
      const instance = keycloakRef.current;

      if (instance?.authenticated) {
        try {
          await instance.updateToken(60);
        } catch {
          clearAccessToken();
          syncUser(null);
          syncError('Сессия истекла. Войдите снова.');
          return;
        }
      }

      setAccessToken(instance?.token ?? null);
    } else {
      setAccessToken(getApiKey());
    }

    try {
      await hydrateCurrentUser('Не удалось обновить профиль');
      bumpSessionVersion();
    } catch (refreshError) {
      syncError(refreshError instanceof Error ? refreshError.message : 'Не удалось обновить профиль');
    }
  }

  async function promptForApiKey(): Promise<void> {
    const currentValue = getApiKey();
    const nextValue = promptText('Введите API key для доступа к ParserNews', currentValue);

    if (nextValue === null) {
      return;
    }

    setApiKey(nextValue);
    setApiKeyConfigured(hasApiKey());
    setAccessToken(getApiKey());

    if (!config) {
      await initializeAuth();
      return;
    }

    await initializeApiKeySession(config);
    pushToast(hasApiKey() ? 'API key сохранен' : 'API key очищен', hasApiKey() ? 'success' : 'info');

    if (isMountedRef.current) {
      setStatus('ready');
    }
  }

  async function clearStoredApiKey(): Promise<void> {
    if (apiKeyConfigured && !confirmAction('Очистить сохраненный API key?')) {
      return;
    }

    clearApiKey();
    setApiKeyConfigured(false);
    clearAccessToken();

    if (config?.authRequired) {
      syncUser(null);
      syncError('');
      return;
    }

    if (config?.provider === 'api_key') {
      await initializeApiKeySession(config);
    }
  }

  async function login(): Promise<void> {
    if (config?.provider === 'api_key') {
      await promptForApiKey();
      return;
    }

    const instance = keycloakRef.current;

    if (!instance) {
      await initializeAuth();
      return;
    }

    await instance.login({
      redirectUri: window.location.href,
    });
  }

  async function logout(): Promise<void> {
    if (config?.provider === 'api_key') {
      await clearStoredApiKey();
      return;
    }

    const instance = keycloakRef.current;

    clearRefreshLoop();
    clearAccessToken();
    syncUser(null);
    syncError('');

    if (!instance) {
      return;
    }

    await instance.logout({
      redirectUri: `${window.location.origin}${window.location.pathname}#/`,
    });
  }

  const contextValue: AuthContextValue = {
    status,
    config,
    provider: config?.provider ?? null,
    authRequired: config?.authRequired ?? false,
    isAuthenticated: Boolean(user),
    user,
    error,
    apiKeyConfigured,
    sessionVersion,
    login,
    logout,
    refreshProfile,
    promptForApiKey,
    clearStoredApiKey,
    hasRole: (role) => hasRole(user?.appRoles ?? [], role),
    hasPermission: (permission) => hasPermission(user?.permissions ?? [], permission),
    reloadAuth: initializeAuth,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
