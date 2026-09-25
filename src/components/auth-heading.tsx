import { BrandMark } from "./brand";

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="auth-hero">
      <span className="mx-auto mb-3 block w-fit">
        <BrandMark size={56} />
      </span>
      <h1 className="auth-hero-title">{title}</h1>
      <p className="auth-hero-sub">{subtitle}</p>
      <p className="mt-2 mb-0 text-xs font-bold text-brand">
        جامعة حورس — كلية الهندسة
      </p>
    </div>
  );
}
