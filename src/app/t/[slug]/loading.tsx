export default function Loading() {
  return (
    <div className="flex flex-1 justify-center bg-white">
      <div className="w-full max-w-sm flex flex-col animate-pulse">
        <div className="h-[220px] bg-[#EEF0F3]" />
        <div className="relative z-10 -mt-[90px] mx-6 mb-4 rounded-3xl bg-white border border-[#EEF0F3] shadow-[0_12px_30px_rgba(20,40,80,0.08)] px-5 py-4">
          <div className="h-3 w-24 bg-[#EEF0F3] rounded-full" />
          <div className="h-5 w-32 bg-[#EEF0F3] rounded-full mt-2.5" />
        </div>
        <div className="px-6 flex flex-col gap-2.5">
          <div className="h-20 bg-[#F7F8FA] border border-[#EEF0F3] rounded-2xl" />
          <div className="h-20 bg-[#F7F8FA] border border-[#EEF0F3] rounded-2xl" />
          <div className="h-20 bg-[#F7F8FA] border border-[#EEF0F3] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
