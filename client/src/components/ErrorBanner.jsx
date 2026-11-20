export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      {message}
    </div>
  );
}
