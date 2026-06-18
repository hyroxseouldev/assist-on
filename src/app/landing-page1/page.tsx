import { Navbar1 } from "@/components/navbar1";
import { Hero115 } from "@/components/hero115";
import { Logos18 } from "@/components/logos18";
import { Feature43 } from "@/components/feature43";
import { Testimonial9 } from "@/components/testimonial9";
import { Pricing2 } from "@/components/pricing2";
import { Cta10 } from "@/components/cta10";
import { Footer2 } from "@/components/footer2";

// Shadcnblocks.com Pages are best installed using the shadcn cli - it will install the blocks as well.
// %insert cli command%

export default function LandingPage1() {
  return (
    <main className="flex w-full flex-col">
      <Navbar1 />
      <Hero115 />
      <Logos18 />
      <Feature43 />
      <Testimonial9 />
      <Pricing2 />
      <Cta10 />
      <Footer2 />
    </main>
  );
}
