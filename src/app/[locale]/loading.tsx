export default function Loading() {
  return (
    <main className="page-center" aria-busy="true">
      <div className="skeleton" />
      <div className="skeleton" style={{ marginTop: 20 }} />
    </main>
  );
}
