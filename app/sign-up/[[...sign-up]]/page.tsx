import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
      <SignUp forceRedirectUrl="/dashboard" />
    </div>
  );
}
