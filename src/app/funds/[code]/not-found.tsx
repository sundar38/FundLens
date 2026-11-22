import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const FundNotFound = () => {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-semibold">Fund not found</h1>
      <p className="text-muted-foreground">
        There is no mutual fund with this scheme code. It may have been closed
        or merged into another scheme.
      </p>
      <Link href="/funds" className={buttonVariants({ variant: "outline" })}>
        Search funds
      </Link>
    </div>
  );
};

export default FundNotFound;
