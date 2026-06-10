import { APP_NAME } from '../config/branding';

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

export default function AppLogo({
  size = 128,
  crop = false,
  className = 'mx-auto mb-4 shrink-0',
}) {
  const fitClass = crop ? 'object-cover object-center' : 'object-contain';

  return (
    <img
      src={logoSrc}
      alt={`${APP_NAME} logo`}
      width={500}
      height={500}
      style={{ width: size, height: size }}
      className={`aspect-square overflow-hidden rounded-lg ${fitClass} ${className}`}
    />
  );
}
