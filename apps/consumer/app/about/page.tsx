import type { Metadata } from "next";
import Link from "next/link";

// A plain server component — static content, no data fetching, so it renders
// straight to HTML and is fully indexable.
export const metadata: Metadata = {
  title: "About us",
  description:
    "GujjuAunty makes homemade Gujarati snacks in small batches and delivers them fresh across India.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold">About GujjuAunty</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Homemade Gujarati snacks, made in small batches and delivered fresh to
        your door.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Our story</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          GujjuAunty started in a home kitchen with a simple idea: the khakhra,
          thepla and gathiya you grew up on shouldn&apos;t be something you only
          get when someone visits from Gujarat. Every batch is made the way it
          would be at home — same recipes, same patience, no shortcuts.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What we make</h2>
        <ul className="mt-2 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              Khakhra
            </strong>{" "}
            — roasted thin and crisp, in classic and masala flavours.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Thepla</strong>{" "}
            — soft methi-masala flatbreads that travel well.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              Gathiya &amp; farsan
            </strong>{" "}
            — crisp gram-flour snacks, mild to tikha.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">How we work</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          We cook to order rather than to a warehouse. That means small batches,
          nothing sitting on a shelf for months, and no preservatives. Orders are
          packed once they&apos;re paid for and shipped shortly after — you can
          follow every stage from your{" "}
          <Link
            href="/orders"
            className="underline underline-offset-4 hover:no-underline"
          >
            orders page
          </Link>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Get in touch</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Questions about an order, a bulk request, or something you&apos;d like
          us to make? We&apos;d love to hear from you.
        </p>
      </section>

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        ← Browse snacks
      </Link>
    </main>
  );
}
