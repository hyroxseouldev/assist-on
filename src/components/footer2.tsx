import { cn } from "@/lib/utils";

interface FooterLink {
  name: string;
  href: string;
}
interface FooterLogo {
  url: string;
  src: string;
  alt: string;
  title: string;
}

interface FooterBasicProps {
  logo?: FooterLogo;
  description?: string;
  copyright?: string;
  legalLinks?: FooterLink[];
  className?: string;
}

interface Footer2Props extends FooterBasicProps {
  logoClassName?: string;
}
type Props = Partial<Footer2Props>;

const defaultProps: Footer2Props = {
  logo: {
    url: "/",
    src: "/brand/clyr-logo.png",
    alt: "clyrtraining logo",
    title: "clyrtraining",
  },
  description: "Online coaching software for building programs.",
  copyright: "© 2026 sunmkim All rights reserved.",
  legalLinks: [
    { name: "Terms", href: "/t/demo/legal/terms" },
    { name: "Privacy", href: "/t/demo/legal/privacy" },
  ],
};

const Footer2 = (props: Props) => {
  const { logo, description, copyright, legalLinks, className } = {
    ...defaultProps,
    ...props,
  };

  return (
    <section className={cn("py-16", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <footer>
          <div className="flex flex-col items-start justify-between gap-8 border-t border-border pt-8 md:flex-row md:items-center">
            <div>
              <a href={logo?.url} className="inline-flex items-center">
                <img
                  src={logo?.src}
                  alt={logo?.alt}
                  title={logo?.title}
                  className="h-8 w-auto dark:invert"
                />
              </a>
              <p className="mt-4 max-w-xl text-sm font-medium text-muted-foreground">
                {description}
              </p>
            </div>
            <ul className="flex gap-4 text-xs font-medium text-muted-foreground">
              {legalLinks?.map((link, linkIdx) => (
                <li key={linkIdx} className="underline hover:text-primary">
                  <a href={link.href}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 text-xs font-medium text-muted-foreground">
            {copyright}
          </p>
        </footer>
      </div>
    </section>
  );
};

export { Footer2 };
