import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export default function GoogleLoginButton({ onError, onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="text-xs text-slate-400 text-center">
        Set <code>VITE_GOOGLE_CLIENT_ID</code> in frontend .env to enable Google sign-in.
      </p>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={async (response) => {
          try {
            await loginWithGoogle(response.credential);
            onSuccess?.();
          } catch (err) {
            onError?.(err.response?.data?.error || 'Google sign-in failed');
          }
        }}
        onError={() => onError?.('Google sign-in was cancelled or failed')}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        width="320"
      />
    </div>
  );
}
