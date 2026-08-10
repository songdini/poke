import React, { useState } from 'react';
import './BossScreen.css';

interface BossScreenProps {
  onToggle: () => void;
}

const BossScreen: React.FC<BossScreenProps> = ({ onToggle }) => {
  const [stealthType, setStealthType] = useState<'dev' | 'excel'>('dev');

  return (
    <div className={`boss-screen-container ${stealthType === 'dev' ? 'dev-ide-theme' : 'excel-theme'}`}>
      {/* 🚀 VS Code / Developer IDE Mode */}
      {stealthType === 'dev' ? (
        <div className="dev-ide-workspace">
          {/* 💻 IDE Top Title Bar */}
          <div className="dev-titlebar">
            <div className="dev-title-left">
              <span className="ide-icon">⚡</span>
              <span className="ide-title">transformer_deep_learning_core.py - PyTorch / DDP Distributed Training - Visual Studio Code</span>
            </div>
            <div className="dev-title-center">
              <div className="ide-search">
                <span>🔍 Search files, symbols & commands (Ctrl+P)</span>
              </div>
            </div>
            <div className="dev-title-right">
              <button className="stealth-mode-badge" onClick={onToggle} title="해제 단축키: F2 또는 ESC">
                ⚡ Developer Study Mode (F2 / ESC to Return)
              </button>
              <button
                className="mode-switch-btn"
                onClick={() => setStealthType('excel')}
                title="엑셀 재무제표로 변경"
              >
                📊 엑셀 화면으로 전환
              </button>
              <div className="window-controls">
                <span>─</span>
                <span>🗖</span>
                <span className="close-btn" onClick={onToggle}>✕</span>
              </div>
            </div>
          </div>

          {/* 💻 IDE Menu Bar */}
          <div className="dev-menubar">
            {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map((item) => (
              <span key={item} className="menu-item">{item}</span>
            ))}
          </div>

          {/* 💻 Main IDE Body (Explorer + Editor + GPU Monitor) */}
          <div className="dev-main-body">
            {/* Left Sidebar File Tree */}
            <div className="dev-sidebar">
              <div className="sidebar-header">EXPLORER</div>
              <div className="sidebar-tree">
                <div className="tree-folder open">📂 ML_TRANSFORMER_CORE_V4</div>
                <div className="tree-file active">📄 train_distributed.py</div>
                <div className="tree-file">📄 model_attention.py</div>
                <div className="tree-file">📄 cuda_kernel_opt.cpp</div>
                <div className="tree-file">📄 dataset_loader.py</div>
                <div className="tree-file">⚙️ config_hyperparams.yaml</div>
                <div className="tree-file">📜 requirements.txt</div>
              </div>
              <div className="sidebar-footer">
                <div style={{ color: '#10b981', fontWeight: 600 }}>🟢 CUDA 12.4 Active</div>
                <div>GPU: NVIDIA H100 80GB</div>
              </div>
            </div>

            {/* Middle Code Editor Area */}
            <div className="dev-editor-container">
              {/* Tab Bar */}
              <div className="editor-tab-bar">
                <div className="tab active">
                  <span>📄 train_distributed.py</span>
                  <span className="tab-close">✕</span>
                </div>
                <div className="tab">
                  <span>📄 model_attention.py</span>
                </div>
                <div className="tab">
                  <span>⚙️ config.yaml</span>
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="editor-breadcrumb">
                src &gt; models &gt; transformer &gt; <span>MultiHeadAttention</span> &gt; <span>forward()</span>
              </div>

              {/* Code Lines with Syntax Highlighting */}
              <div className="code-editor">
                <div className="line-numbers">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <div className="code-content">
                  <div className="code-line"><span className="keyword">import</span> <span className="module">torch</span></div>
                  <div className="code-line"><span className="keyword">import</span> <span className="module">torch.nn</span> <span className="keyword">as</span> <span className="module">nn</span></div>
                  <div className="code-line"><span className="keyword">import</span> <span className="module">torch.distributed</span> <span className="keyword">as</span> <span className="module">dist</span></div>
                  <div className="code-line"><span className="keyword">from</span> <span className="module">torch.nn.parallel</span> <span className="keyword">import</span> <span className="type">DistributedDataParallel</span> <span className="keyword">as</span> <span className="type">DDP</span></div>
                  <div className="code-line">&nbsp;</div>
                  <div className="code-line"><span className="comment"># 🚀 Multi-Head Scaled Dot-Product Self Attention Kernel Optimization</span></div>
                  <div className="code-line"><span className="keyword">class</span> <span className="class-name">MultiHeadScaledAttention</span>(<span className="type">nn.Module</span>):</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">def</span> <span className="func">__init__</span>(<span className="self">self</span>, d_model: <span className="builtin">int</span> = <span className="number">1024</span>, num_heads: <span className="builtin">int</span> = <span className="number">16</span>, dropout: <span className="builtin">float</span> = <span className="number">0.1</span>):</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="builtin">super</span>().<span className="func">__init__</span>()</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.d_model = d_model</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.num_heads = num_heads</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.head_dim = d_model // num_heads</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.qkv_proj = <span className="type">nn.Linear</span>(d_model, d_model * <span className="number">3</span>, bias=<span className="keyword">False</span>)</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.out_proj = <span className="type">nn.Linear</span>(d_model, d_model, bias=<span className="keyword">False</span>)</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="self">self</span>.dropout = <span className="type">nn.Dropout</span>(dropout)</div>
                  <div className="code-line">&nbsp;</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">def</span> <span className="func">forward</span>(<span className="self">self</span>, x: <span className="type">torch.Tensor</span>, mask: <span className="type">torch.Tensor</span> = <span className="keyword">None</span>) -&gt; <span className="type">torch.Tensor</span>:</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;batch_size, seq_len, _ = x.shape</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="comment"># Tensor shape transformation: [B, S, E] -&gt; [B, S, 3, H, D]</span></div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;qkv = <span className="self">self</span>.qkv_proj(x).reshape(batch_size, seq_len, <span className="number">3</span>, <span className="self">self</span>.num_heads, <span className="self">self</span>.head_dim)</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;q, k, v = qkv.permute(<span className="number">2</span>, <span className="number">0</span>, <span className="number">3</span>, <span className="number">1</span>, <span className="number">4</span>).unbind(<span className="number">0</span>)</div>
                  <div className="code-line">&nbsp;</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="comment"># FlashAttention-2 High Throughput CUDA Kernel Acceleration</span></div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;attn_output = <span className="module">torch.nn.functional</span>.<span className="func">scaled_dot_product_attention</span>(</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;q, k, v, attn_mask=mask, dropout_p=<span className="number">0.1</span>, is_causal=<span className="keyword">True</span></div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;attn_output = attn_output.transpose(<span className="number">1</span>, <span className="number">2</span>).contiguous().view(batch_size, seq_len, <span className="self">self</span>.d_model)</div>
                  <div className="code-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">return</span> <span className="self">self</span>.out_proj(attn_output)</div>
                </div>
              </div>

              {/* Bottom Integrated Terminal */}
              <div className="dev-terminal-panel">
                <div className="terminal-tabs">
                  <span className="active">TERMINAL</span>
                  <span>OUTPUT</span>
                  <span>DEBUG CONSOLE</span>
                  <span>PROBLEMS (0)</span>
                </div>
                <div className="terminal-body">
                  <div className="term-line info">[System Init] PyTorch 2.4.0+cu124 DDP Training Pipeline Started</div>
                  <div className="term-line success">[Worker 0] Distributed Process Group initialized: Backend=NCCL, WorldSize=8</div>
                  <div className="term-line">[Epoch 48/100] Step 1420/3000 | Loss: 0.0382 | Perplexity: 1.038 | Lr: 2.4e-5</div>
                  <div className="term-line">[Epoch 48/100] Step 1430/3000 | Loss: 0.0369 | Perplexity: 1.036 | Lr: 2.4e-5</div>
                  <div className="term-line success">✔ Checkpoint saved: ./models/checkpoints/epoch_48_val_loss_0.0369.pt</div>
                  <div className="term-prompt">$ python -m torch.distributed.run --nproc_per_node=8 train_distributed.py --batch_size=64</div>
                </div>
              </div>
            </div>

            {/* Right Side GPU Monitor Panel */}
            <div className="dev-gpu-monitor">
              <div className="gpu-card">
                <div className="gpu-title">📊 GPU ACCELERATOR #0</div>
                <div className="gpu-name">NVIDIA H100 SXM5 80GB</div>
                <div className="gauge-label">VRAM Usage: 64.2 GB / 80.0 GB (80.2%)</div>
                <div className="gauge-bar"><div className="fill" style={{ width: '80%' }}></div></div>
                <div className="gauge-label">GPU Core Utilization: 98%</div>
                <div className="gauge-bar"><div className="fill green" style={{ width: '98%' }}></div></div>
                <div className="gauge-label">Power Draw: 520W / 700W</div>
                <div className="gauge-bar"><div className="fill yellow" style={{ width: '74%' }}></div></div>
              </div>

              <div className="gpu-card">
                <div className="gpu-title">📌 TENSOR METRICS</div>
                <div className="metric-row"><span>Batch Size:</span> <strong>64</strong></div>
                <div className="metric-row"><span>Seq Length:</span> <strong>2048</strong></div>
                <div className="metric-row"><span>Precision:</span> <strong>bfloat16 (Mixed)</strong></div>
                <div className="metric-row"><span>Throughput:</span> <strong style={{ color: '#10b981' }}>18,450 tokens/s</strong></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 📊 Excel Financial Mode */
        <div className="boss-excel-full">
          <div className="boss-excel-titlebar">
            <div className="title-left">
              <span className="app-icon">📊</span>
              <span className="doc-title">Q3_2026_Financial_Audit_Report_CONFIDENTIAL.xlsx - Excel</span>
              <span className="autosave-badge">AutoSave <span className="toggle-on">ON</span></span>
            </div>
            <div className="title-right">
              <button className="stealth-mode-badge" onClick={onToggle}>
                ⚡ Stealth Mode Active (F2 / ESC to Return)
              </button>
              <button className="mode-switch-btn" onClick={() => setStealthType('dev')}>
                💻 개발자 IDE 화면으로 전환
              </button>
              <div className="window-controls">
                <span className="close-btn" onClick={onToggle}>✕</span>
              </div>
            </div>
          </div>
          <div className="boss-sheet-viewport">
            <div className="sheet-doc-header">
              <h2>(주) 글로벌 파이낸셜 솔루션 - 2026년 3분기 연결재무제표 보고서</h2>
            </div>
            <table className="boss-grid-table">
              <thead>
                <tr>
                  <th>A (코드)</th>
                  <th>B (계정과목)</th>
                  <th>C (2026년 3분기)</th>
                  <th>D (2025년 3분기)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>REV_101</td><td>매출액 (Gross Revenue)</td><td className="num-cell">482,910,000</td><td className="num-cell">412,300,000</td></tr>
                <tr><td>COGS_102</td><td>매출원가 (COGS)</td><td className="num-cell">(210,400,000)</td><td className="num-cell">(195,100,000)</td></tr>
                <tr className="highlight-row major"><td>OP_300</td><td>영업이익 (Operating Income)</td><td className="num-cell">174,210,000</td><td className="num-cell">127,800,000</td></tr>
                <tr className="grand-total-row"><td>NI_600</td><td>당기순이익 (Net Income)</td><td className="num-cell">148,280,000</td><td className="num-cell">106,840,000</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BossScreen;
