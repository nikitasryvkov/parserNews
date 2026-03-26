interface ErrorCardProps {
  message: string;
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className="card card-danger">
      <p>{message}</p>
    </div>
  );
}
