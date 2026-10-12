import "../styles/Header.css";
import "../styles/Compare.css";

function Compare() {
  return (
    <section className="page">
      <p className="eyebrow">02 / Compare</p>
      <h1 className="page-title">Compare</h1>
      <div className="compare-grid">
        <div className="glass-card compare-card">Compound A</div>
        <div className="glass-card compare-card">Compound B</div>
        <button className="compare-add">Add a compound to compare</button>
      </div>
    </section>
  );
}

export default Compare;
