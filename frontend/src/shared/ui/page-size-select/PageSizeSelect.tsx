import { PAGE_SIZE_OPTIONS } from '../../config/constants';

interface PageSizeSelectProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
}

export function PageSizeSelect({ id, value, onChange }: PageSizeSelectProps) {
  return (
    <label className="page-size-label" htmlFor={id}>
      <span className="page-size-label-text">На странице</span>
      <select
        id={id}
        className="search-input page-size-select"
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
