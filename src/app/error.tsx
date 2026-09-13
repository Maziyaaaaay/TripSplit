"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-6 text-center">
      <div>
        <div className="text-[20px] font-extrabold text-[#0B0B0F]">Something went wrong</div>
        <p className="mt-2 text-[14px] text-[#6B7280]">
          That didn&rsquo;t work. Try again, or reload the page.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-block rounded-full bg-[#0B0B0F] text-white text-[14px] font-bold px-6 py-3 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
