import { APP_NAME } from '../config/branding';

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

export default function AppLogo({ className = 'mx-auto mb-4 h-28 w-28 object-contain sm:h-32 sm:w-32' }) {
  return (
    <img
      src={logoSrc}
      alt={`${APP_NAME} logo`}
      className={className}
      width={128}
      height={128}
    />
  );
}
