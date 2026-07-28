import Link from "next/link";
import { CodeClaimForm } from "@/components/radar/code-claim-form";

export default function RedeemCodePage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#07070d] px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,69,132,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative mx-auto flex min-h-[calc(100svh-48px)] w-full max-w-md flex-col justify-center">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground transition hover:text-white">
            恋爱雷达 Love Radar
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal">领取高级版兑换码</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            购买成功后，在这里填写面包多订单号领取兑换码。拿到兑换码后，回到你的报告页解锁完整内容。
          </p>
        </div>

        <CodeClaimForm />

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          本服务为虚拟数字内容。兑换码领取后请尽快回到报告页使用。
        </p>
      </div>
    </main>
  );
}
