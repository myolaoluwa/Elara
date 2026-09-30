import Link from "next/link";

export default function NotFound() {
  return <main className="standalone"><p className="eyebrow">404</p><h1>That page isn’t in this workspace.</h1><Link href="/">Return to dashboard</Link></main>;
}
