import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white px-6 text-center">
      <div>
        <div className="text-[20px] font-extrabold text-[#0B0B0F]">Page not found</div>
        <p className="mt-2 text-[14px] text-[#6B7280]">
          That link doesn&rsquo;t go anywhere. Double-check it, or start over.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[#0B0B0F] text-white text-[14px] font-bold px-6 py-3"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
