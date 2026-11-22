import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FundSearchFormProps = {
  defaultQuery?: string;
  disabled?: boolean;
};

// A GET form: submitting it navigates to /funds?q=..., so the search lives
// in the URL (shareable, bookmarkable) and works even before JS loads.
const FundSearchForm = ({ defaultQuery = "", disabled = false }: FundSearchFormProps) => {
  return (
    <Form action="/funds" role="search" className="flex w-full max-w-xl gap-2">
      <label htmlFor="fund-search" className="sr-only">
        Search mutual funds
      </label>
      <Input
        id="fund-search"
        name="q"
        type="search"
        defaultValue={defaultQuery}
        placeholder="Search by fund name, e.g. Parag Parikh"
        minLength={2}
        required
        disabled={disabled}
        className="h-9"
      />
      <Button type="submit" size="lg" disabled={disabled}>
        Search
      </Button>
    </Form>
  );
};

export default FundSearchForm;
