import { APP_NAME } from '../config/branding';

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

export default function AppLogo({
  size = 128,
  className = 'mx-auto mb-4 shrink-0 object-contain',
}) {
  return (
    <img
      src={logoSrc}
      alt={`${APP_NAME} logo`}
      width={500}
      height={500}
      style={{ width: size, height: size }}
      className={`aspect-square rounded-lg ${className}`}
    />
  );
}
