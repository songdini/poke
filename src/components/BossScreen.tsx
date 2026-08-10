import React from 'react';
import './BossScreen.css';

interface BossScreenProps {
  onToggle: () => void;
}

const BossScreen: React.FC<BossScreenProps> = ({ onToggle }) => {
  return (
    <div className="boss-screen-container">
      {/* 📊 Excel Top Title Bar */}
      <div className="boss-excel-titlebar">
        <div className="title-left">
          <span className="app-icon">📊</span>
          <span className="doc-title">Q3_2026_Financial_Audit_Report_CONFIDENTIAL.xlsx - Excel</span>
          <span className="autosave-badge">AutoSave <span className="toggle-on">ON</span></span>
        </div>
        <div className="title-center">
          <div className="search-box">
            <span>🔍 Search (Alt+Q)</span>
          </div>
        </div>
        <div className="title-right">
          <button className="boss-toggle-btn" onClick={onToggle} title="해제 단축키: F2 또는 ESC">
            ⚡ Stealth Mode Active (F2 / ESC to Return)
          </button>
          <span className="user-profile">👤 KIMSJ (Corp_Audit)</span>
          <div className="window-controls">
            <span>─</span>
            <span>🗖</span>
            <span className="close-btn" onClick={onToggle}>✕</span>
          </div>
        </div>
      </div>

      {/* 📊 Excel Ribbon Menu */}
      <div className="boss-ribbon-tabs">
        {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help'].map((tab, idx) => (
          <div key={tab} className={`ribbon-tab ${idx === 1 ? 'active' : ''}`}>
            {tab}
          </div>
        ))}
      </div>

      {/* 📊 Excel Formula Bar */}
      <div className="boss-formula-bar">
        <div className="name-box">C14: NET_INCOME</div>
        <div className="fx-icon">fx</div>
        <div className="formula-input">
          =SUM(C4:C12) * (1 - CORPORATE_TAX_RATE_2026)
        </div>
      </div>

      {/* 📄 Main Financial Worksheet Content */}
      <div className="boss-sheet-viewport">
        {/* Header Document Title */}
        <div className="sheet-doc-header">
          <h2>(주) 글로벌 파이낸셜 솔루션 - 2026년 3분기 연결재무제표 및 손익계산서 보고서</h2>
          <p>Confidential Corporate Audit & Balance Sheet (작성일자: 2026-09-30 | 단위: 원, %)</p>
        </div>

        {/* 📊 Table 1: 손익계산서 (Income Statement) */}
        <div className="boss-table-section">
          <div className="table-title">■ 1. 2026년 3분기 누적 요약 손익계산서 (Statement of Profit or Loss)</div>
          <table className="boss-grid-table">
            <thead>
              <tr>
                <th className="corner-col"></th>
                <th style={{ width: '60px' }}>A (코드)</th>
                <th>B (계정과목 / Financial Items)</th>
                <th style={{ width: '160px' }}>C (2026년 3분기)</th>
                <th style={{ width: '160px' }}>D (2025년 3분기)</th>
                <th style={{ width: '120px' }}>E (증감률 YoY)</th>
                <th style={{ width: '180px' }}>F (수식 검증 레코드)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-header">4</td>
                <td>REV_101</td>
                <td><strong>매출액 (Gross Revenue)</strong></td>
                <td className="num-cell">482,910,000</td>
                <td className="num-cell">412,300,000</td>
                <td className="percent-cell positive">+17.1%</td>
                <td className="formula-cell">=SUM(SALES_Q1:Q3)</td>
              </tr>
              <tr>
                <td className="row-header">5</td>
                <td>COGS_102</td>
                <td>매출원가 (Cost of Goods Sold)</td>
                <td className="num-cell">(210,400,000)</td>
                <td className="num-cell">(195,100,000)</td>
                <td className="percent-cell">+7.8%</td>
                <td className="formula-cell">=RAW_MATERIAL + MFG_COST</td>
              </tr>
              <tr className="highlight-row">
                <td className="row-header">6</td>
                <td>GP_200</td>
                <td><strong>매출총이익 (Gross Profit)</strong></td>
                <td className="num-cell">272,510,000</td>
                <td className="num-cell">217,200,000</td>
                <td className="percent-cell positive">+25.5%</td>
                <td className="formula-cell">=C4 - C5</td>
              </tr>
              <tr>
                <td className="row-header">7</td>
                <td>SGA_201</td>
                <td>판매비와 관리비 (SG&A Expenses)</td>
                <td className="num-cell">(98,300,000)</td>
                <td className="num-cell">(89,400,000)</td>
                <td className="percent-cell">+9.9%</td>
                <td className="formula-cell">=PAYROLL + RENT + MKTG</td>
              </tr>
              <tr className="highlight-row major">
                <td className="row-header">8</td>
                <td>OP_300</td>
                <td><strong>영업이익 (Operating Income)</strong></td>
                <td className="num-cell">174,210,000</td>
                <td className="num-cell">127,800,000</td>
                <td className="percent-cell positive">+36.3%</td>
                <td className="formula-cell">=C6 - C7</td>
              </tr>
              <tr>
                <td className="row-header">9</td>
                <td>NON_OP_1</td>
                <td>영업외수익 (Non-Operating Income)</td>
                <td className="num-cell">12,400,000</td>
                <td className="num-cell">8,200,000</td>
                <td className="percent-cell positive">+51.2%</td>
                <td className="formula-cell">=INTEREST_INC + FX_GAIN</td>
              </tr>
              <tr>
                <td className="row-header">10</td>
                <td>NON_OP_2</td>
                <td>영업외비용 (Non-Operating Expenses)</td>
                <td className="num-cell">(3,550,000)</td>
                <td className="num-cell">(4,100,000)</td>
                <td className="percent-cell">-13.4%</td>
                <td className="formula-cell">=INTEREST_EXP</td>
              </tr>
              <tr className="highlight-row">
                <td className="row-header">11</td>
                <td>EBT_400</td>
                <td><strong>법인세차감전순이익 (EBT)</strong></td>
                <td className="num-cell">183,060,000</td>
                <td className="num-cell">131,900,000</td>
                <td className="percent-cell positive">+38.8%</td>
                <td className="formula-cell">=C8 + C9 - C10</td>
              </tr>
              <tr>
                <td className="row-header">12</td>
                <td>TAX_500</td>
                <td>법인세비용 (Income Tax Expense)</td>
                <td className="num-cell">(34,780,000)</td>
                <td className="num-cell">(25,060,000)</td>
                <td className="percent-cell">+38.8%</td>
                <td className="formula-cell">=C11 * 0.19</td>
              </tr>
              <tr className="grand-total-row">
                <td className="row-header">13</td>
                <td>NI_600</td>
                <td><strong>당기순이익 (Net Income)</strong></td>
                <td className="num-cell">148,280,000</td>
                <td className="num-cell">106,840,000</td>
                <td className="percent-cell positive">+38.8%</td>
                <td className="formula-cell">=C11 - C12</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 📈 Chart & Financial Ratios Section */}
        <div className="boss-chart-and-ratio-section">
          {/* SVG Financial Bar Chart */}
          <div className="chart-card">
            <div className="card-title">📊 분기별 매출액 및 영업이익 추이 (Quarterly Financial Trend)</div>
            <div className="svg-chart-container">
              <svg width="100%" height="180" viewBox="0 0 500 180">
                {/* Background Grid Lines */}
                <line x1="50" y1="30" x2="480" y2="30" stroke="#e1dfdd" strokeDasharray="3,3" />
                <line x1="50" y1="70" x2="480" y2="70" stroke="#e1dfdd" strokeDasharray="3,3" />
                <line x1="50" y1="110" x2="480" y2="110" stroke="#e1dfdd" strokeDasharray="3,3" />
                <line x1="50" y1="150" x2="480" y2="150" stroke="#107c41" strokeWidth="2" />

                {/* Q1 Bar */}
                <rect x="90" y="60" width="35" height="90" fill="#107c41" rx="2" />
                <rect x="130" y="100" width="35" height="50" fill="#2563eb" rx="2" />
                <text x="127" y="166" fontSize="11" fill="#605e5c" textAnchor="middle">2026 Q1</text>

                {/* Q2 Bar */}
                <rect x="200" y="45" width="35" height="105" fill="#107c41" rx="2" />
                <rect x="240" y="85" width="35" height="65" fill="#2563eb" rx="2" />
                <text x="237" y="166" fontSize="11" fill="#605e5c" textAnchor="middle">2026 Q2</text>

                {/* Q3 Bar */}
                <rect x="310" y="35" width="35" height="115" fill="#107c41" rx="2" />
                <rect x="350" y="75" width="35" height="75" fill="#2563eb" rx="2" />
                <text x="347" y="166" fontSize="11" fill="#605e5c" textAnchor="middle">2026 Q3 (현)</text>

                {/* Target Q4 Bar (Hatched) */}
                <rect x="420" y="25" width="35" height="125" fill="#a19f9d" rx="2" opacity="0.6" />
                <text x="437" y="166" fontSize="11" fill="#605e5c" textAnchor="middle">2026 Q4 (목표)</text>

                {/* Legend */}
                <rect x="320" y="10" width="12" height="12" fill="#107c41" />
                <text x="336" y="20" fontSize="10" fill="#201f1e">매출액</text>

                <rect x="390" y="10" width="12" height="12" fill="#2563eb" />
                <text x="406" y="20" fontSize="10" fill="#201f1e">영업이익</text>
              </svg>
            </div>
          </div>

          {/* Key Audit Ratios */}
          <div className="ratio-card">
            <div className="card-title">📌 주요 재무건전성 및 안정성 지표</div>
            <div className="ratio-grid">
              <div className="ratio-box">
                <span className="label">영업이익률 (OP Margin)</span>
                <span className="value positive">36.07%</span>
                <span className="sub font-cons">=C8 / C4</span>
              </div>
              <div className="ratio-box">
                <span className="label">부채비율 (Debt Ratio)</span>
                <span className="value">42.15%</span>
                <span className="sub font-cons">=LIAB / EQUITY</span>
              </div>
              <div className="ratio-box">
                <span className="label">유동비율 (Current Ratio)</span>
                <span className="value positive">214.8%</span>
                <span className="sub font-cons">=CURR_ASSETS / CURR_LIAB</span>
              </div>
              <div className="ratio-box">
                <span className="label">ROE (자본수익률)</span>
                <span className="value positive">18.4%</span>
                <span className="sub font-cons">=NI / AVG_EQUITY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📑 Bottom Excel Status & Sheet Tabs Bar */}
      <div className="boss-sheet-tab-bar">
        <div className="sheet-tab active">📊 3Q_Income_Statement</div>
        <div className="sheet-tab">📑 Balance_Sheet</div>
        <div className="sheet-tab">📈 Cash_Flow_Matrix</div>
        <div className="sheet-tab">📌 Audit_Notes</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="status-bar-right">
          <span>READY</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>COUNT=10</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span style={{ fontWeight: 700, color: '#107c41' }}>SUM = 1,248,510,000</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default BossScreen;
