export function Notice({ title, text }: { title: string; text: string }) {
  return (
    <main className="notice">
      <h1>{title}</h1>
      <p>{text}</p>
    </main>
  );
}
