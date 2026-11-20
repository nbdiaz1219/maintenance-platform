export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded border border-[#ba0517] bg-[#fef1ee] px-4 py-3 text-[13px] text-[#8e030f]">
      {message}
    </div>
  );
}
