import React, { useMemo, useState } from 'react';
import {
  buildRoomInviteUrl,
  generateQrMatrix,
  normalizeCustomDomain,
} from '../utils/domainShare';

interface DomainQrModalProps {
  isOpen: boolean;
  customDomain: string;
  activeRoomId: string | null;
  onSaveCustomDomain: (normalizedDomain: string) => void;
  onClose: () => void;
}

export const DomainQrModal: React.FC<DomainQrModalProps> = ({
  isOpen,
  customDomain,
  activeRoomId,
  onSaveCustomDomain,
  onClose,
}) => {
  const [domainInput, setDomainInput] = useState<string>(
    customDomain ? customDomain.replace(/^https?:\/\//, '') : ''
  );
  const [domainError, setDomainError] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');

  const fallbackOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://game.tenmiencuaban.com';

  const parsedPreview = useMemo(() => {
    if (domainInput.trim()) {
      const check = normalizeCustomDomain(domainInput);
      if (check.valid) return check;
    }
    if (customDomain) {
      const check = normalizeCustomDomain(customDomain);
      if (check.valid) return check;
    }
    return {
      valid: true,
      normalized: '',
      subdomainHost: 'game',
      rootDomain: 'tenmiencuaban.com',
    };
  }, [customDomain, domainInput]);

  const effectiveInviteUrl = useMemo(
    () => buildRoomInviteUrl(fallbackOrigin, customDomain, activeRoomId),
    [fallbackOrigin, customDomain, activeRoomId]
  );

  const qrMatrix = useMemo(
    () => generateQrMatrix(effectiveInviteUrl),
    [effectiveInviteUrl]
  );

  if (!isOpen) return null;

  const handleApplyDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const check = normalizeCustomDomain(domainInput);
    if (!check.valid) {
      setDomainError(
        check.error || 'Tên miền không hợp lệ. Ví dụ: game.tenmiencuaban.com'
      );
      setSavedNotice('');
      return;
    }
    setDomainError('');
    onSaveCustomDomain(check.normalized);
    setSavedNotice(`Đã áp dụng tên miền: ${check.normalized}`);
  };

  const handleClearDomain = () => {
    setDomainInput('');
    setDomainError('');
    onSaveCustomDomain('');
    setSavedNotice('Đã khôi phục về địa chỉ máy chủ mặc định.');
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? '' : prev));
    }, 2000);
  };

  const handleDownloadQrSvg = () => {
    const pad = 4;
    const total = qrMatrix.size + pad * 2;
    let rects = `<rect width="${total}" height="${total}" fill="#f8fafc"/>`;
    for (let y = 0; y < qrMatrix.size; y++) {
      for (let x = 0; x < qrMatrix.size; x++) {
        if (qrMatrix.cells[y][x]) {
          rects += `<rect x="${x + pad}" y="${y + pad}" width="1" height="1" fill="#0b0e14"/>`;
        }
      }
    }
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${rects}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-co-dai-mat-ma-${activeRoomId || 'game'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [guideTab, setGuideTab] = useState<'nocard' | 'cloudrun'>('nocard');

  const quietZone = 3;
  const viewBoxSize = qrMatrix.size + quietZone * 2;

  const renderCnameTarget =
    guideTab === 'nocard' ? 'ten-dich-vu.onrender.com' : 'ghs.googlehosted.com';

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="domain-qr-modal"
      aria-label="Mã QR và Cấu hình Tên miền riêng"
      className="fixed inset-0 bg-black/85 pointer-events-auto flex items-center justify-center p-4 z-50"
    >
      <div className="pixel-stone-panel p-6 max-w-4xl w-full flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#fbbf24]">
              MÃ QR PHÒNG CHƠI & GẮN TÊN MIỀN RIÊNG ({parsedPreview.subdomainHost}.
              {parsedPreview.rootDomain})
            </span>
            <h2 className="text-xl font-bold text-[#f4f1ea]">
              Chia Sẻ Link Mời & Hướng Dẫn Gắn Tên Miền Phụ (Subdomain)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pixel-stone-button px-3 py-1.5 text-xs font-mono font-bold text-[#cbd5e1] cursor-pointer whitespace-nowrap"
          >
            Đóng [Esc]
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): QR Code + Custom Domain Input */}
          <div className="lg:col-span-5 bg-[#0f141d] border border-[#263042] p-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#fbbf24]">
              01. Mã QR & Tên Miền Chia Sẻ
            </h3>

            {/* Custom Domain Form */}
            <form onSubmit={handleApplyDomain} className="flex flex-col gap-2">
              <label className="text-xs text-[#cbd5e1]">
                Tên miền phụ của bạn (tùy chọn)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  data-testid="custom-domain-input"
                  value={domainInput}
                  onChange={(e) => {
                    setDomainInput(e.target.value);
                    if (domainError) setDomainError('');
                  }}
                  placeholder="game.tenmiencuaban.com"
                  className="flex-1 bg-[#161b26] border border-[#384358] px-3 py-2 text-xs font-mono text-[#f4f1ea] focus:outline-none focus:border-[#fbbf24]"
                />
                <button
                  type="submit"
                  data-testid="save-custom-domain-btn"
                  className="pixel-amber-cta px-3 py-2 text-xs font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Áp Dụng
                </button>
              </div>
              {customDomain && (
                <button
                  type="button"
                  onClick={handleClearDomain}
                  className="text-[11px] font-mono text-[#94a3b8] hover:text-[#f4f1ea] self-start cursor-pointer underline"
                >
                  Khôi phục link máy chủ mặc định
                </button>
              )}
              {domainError && (
                <span className="text-xs text-[#fda4af]">{domainError}</span>
              )}
              {savedNotice && !domainError && (
                <span className="text-xs text-[#6ee7b7]">{savedNotice}</span>
              )}
            </form>

            {/* Pixel QR Code Display */}
            <div className="bg-[#161b26] border-2 border-[#384358] p-4 flex flex-col items-center gap-3">
              <div className="bg-[#f8fafc] p-2 border-2 border-[#fbbf24]">
                <svg
                  data-testid="invite-qr-svg"
                  viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                  shapeRendering="crispEdges"
                  className="w-40 h-40 block"
                  role="img"
                  aria-label={`Mã QR cho ${effectiveInviteUrl}`}
                >
                  <rect
                    width={viewBoxSize}
                    height={viewBoxSize}
                    fill="#f8fafc"
                  />
                  {qrMatrix.cells.map((row, y) =>
                    row.map((cell, x) =>
                      cell ? (
                        <rect
                          key={`${x}-${y}`}
                          x={x + quietZone}
                          y={y + quietZone}
                          width={1}
                          height={1}
                          fill="#0b0e14"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <div className="w-full text-center space-y-1">
                <div className="text-[11px] font-mono text-[#94a3b8]">
                  {activeRoomId
                    ? `LINK MỜI VÀO THẲNG PHÒNG #${activeRoomId}`
                    : 'LINK TRÒ CHƠI CHÍNH THỨC'}
                </div>
                <div
                  data-testid="invite-url-readout"
                  className="bg-[#0b0e14] border border-[#263042] px-2.5 py-1.5 text-xs font-mono text-[#38bdf8] break-all select-all"
                >
                  {effectiveInviteUrl}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => copyText('inviteUrl', effectiveInviteUrl)}
                  className="flex-1 pixel-amber-cta py-2 px-3 text-xs font-bold text-[#0b0e14] cursor-pointer whitespace-nowrap"
                >
                  {copiedKey === 'inviteUrl'
                    ? 'Đã Sao Chép Link!'
                    : 'Sao Chép Link Mời'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="pixel-stone-button py-2 px-3 text-xs font-semibold text-[#f4f1ea] cursor-pointer whitespace-nowrap"
                >
                  Tải Mã QR (.SVG)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Step-by-Step DNS Guide */}
          <div className="lg:col-span-7 bg-[#0f141d] border border-[#263042] p-4 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#38bdf8]">
                02. Hướng Dẫn Gắn Tên Miền ({parsedPreview.subdomainHost}.
                {parsedPreview.rootDomain})
              </h3>
              <div className="flex items-center gap-1.5 bg-[#161b26] p-1 border border-[#263042]">
                <button
                  type="button"
                  onClick={() => setGuideTab('nocard')}
                  className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    guideTab === 'nocard'
                      ? 'bg-[#232b3d] text-[#6ee7b7]'
                      : 'text-[#94a3b8] hover:text-[#f4f1ea]'
                  }`}
                >
                  Không Cần Thẻ (GitHub + Render)
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('cloudrun')}
                  className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    guideTab === 'cloudrun'
                      ? 'bg-[#232b3d] text-[#fbbf24]'
                      : 'text-[#94a3b8] hover:text-[#f4f1ea]'
                  }`}
                >
                  Google Cloud Run
                </button>
              </div>
            </div>

            {guideTab === 'nocard' ? (
              <div className="space-y-2.5 text-xs text-[#cbd5e1] leading-relaxed">
                <div className="bg-[#161b26] border border-[#263042] p-3 space-y-1">
                  <div className="font-bold text-[#6ee7b7]">
                    Bước 1: Đẩy code lên GitHub ngay trong AI Studio
                  </div>
                  <p>
                    Ở khung bên phải màn hình AI Studio, nhấn vào tab{' '}
                    <strong className="text-[#f4f1ea]">GitHub</strong> (nằm cạnh
                    nút <strong className="text-[#cbd5e1]">Publish</strong> và{' '}
                    <strong className="text-[#cbd5e1]">Versions</strong>) → kết
                    nối kho GitHub của bạn và nhấn{' '}
                    <strong className="text-[#f4f1ea]">Push / Commit</strong>.
                  </p>
                </div>

                <div className="bg-[#161b26] border border-[#263042] p-3 space-y-1">
                  <div className="font-bold text-[#6ee7b7]">
                    Bước 2: Tạo Web Service miễn phí trên Render.com (Không cần thẻ)
                  </div>
                  <p>
                    Đăng nhập <span className="font-mono text-[#38bdf8]">render.com</span>{' '}
                    bằng tài khoản GitHub → nhấn{' '}
                    <strong className="text-[#f4f1ea]">New + → Web Service</strong>{' '}
                    → chọn repo game vừa đẩy lên → chọn gói{' '}
                    <strong className="text-[#6ee7b7]">Free ($0/tháng)</strong>.
                    (File cấu hình <span className="font-mono text-[#fbbf24]">render.yaml</span>{' '}
                    đã được tạo sẵn trong code).
                  </p>
                </div>

                <div className="bg-[#161b26] border border-[#384358] p-3 space-y-2">
                  <div className="font-bold text-[#fbbf24]">
                    Bước 3: Thêm Custom Domain trên Render & Trỏ CNAME tại Mắt Bão / Nhân Hòa / Tenten / PA
                  </div>
                  <p>
                    Trong Render → mở mục{' '}
                    <strong className="text-[#f4f1ea]">Settings → Custom Domains</strong>{' '}
                    → nhập{' '}
                    <span className="font-mono text-[#6ee7b7]">
                      {parsedPreview.subdomainHost}.{parsedPreview.rootDomain}
                    </span>
                    , sau đó vào trang DNS tên miền Việt Nam tạo bản ghi:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 font-mono text-xs pt-1">
                    <div className="sm:col-span-4 bg-[#0b0e14] border border-[#263042] p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-[#94a3b8]">
                          HOST / TÊN RECORD
                        </div>
                        <div className="font-bold text-[#6ee7b7]">
                          {parsedPreview.subdomainHost}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyText('host', parsedPreview.subdomainHost)
                        }
                        className="pixel-stone-button px-2 py-1 text-[10px] text-[#cbd5e1] cursor-pointer"
                      >
                        {copiedKey === 'host' ? 'Đã Chép' : 'Copy'}
                      </button>
                    </div>

                    <div className="sm:col-span-3 bg-[#0b0e14] border border-[#263042] p-2.5">
                      <div className="text-[10px] text-[#94a3b8]">
                        LOẠI (TYPE)
                      </div>
                      <div className="font-bold text-[#fbbf24]">CNAME</div>
                    </div>

                    <div className="sm:col-span-5 bg-[#0b0e14] border border-[#263042] p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#94a3b8]">
                          GIÁ TRỊ (VALUE)
                        </div>
                        <div className="font-bold text-[#38bdf8] whitespace-nowrap">
                          {renderCnameTarget}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-[#cbd5e1] leading-relaxed">
                <div className="bg-[#161b26] border border-[#263042] p-3 space-y-1">
                  <div className="font-bold text-[#fbbf24]">
                    Bước 1: Nhấn nút Publish (cạnh nút Share) ở góc trên bên phải
                  </div>
                  <p>
                    Nhấn nút <strong className="text-[#f4f1ea]">Publish</strong> ở
                    góc trên bên phải thanh công cụ AI Studio → chọn{' '}
                    <strong className="text-[#f4f1ea]">Select a Cloud Project</strong>{' '}
                    (đã bật Billing) và nhấn <strong className="text-[#f4f1ea]">Continue</strong>.
                  </p>
                </div>

                <div className="bg-[#161b26] border border-[#263042] p-3 space-y-1">
                  <div className="font-bold text-[#fbbf24]">
                    Bước 2: Khai báo Subdomain trong Google Cloud Run
                  </div>
                  <p>
                    Mở <span className="font-mono text-[#38bdf8]">Cloud Run</span>{' '}
                    trên Google Cloud Console → nhấn{' '}
                    <strong className="text-[#f4f1ea]">
                      Manage Custom Domains
                    </strong>{' '}
                    → <strong className="text-[#f4f1ea]">Add Mapping</strong> →
                    chọn dịch vụ game và nhập tên miền phụ{' '}
                    <span className="font-mono text-[#6ee7b7]">
                      {parsedPreview.subdomainHost}.{parsedPreview.rootDomain}
                    </span>
                    .
                  </p>
                </div>

                <div className="bg-[#161b26] border border-[#384358] p-3 space-y-2">
                  <div className="font-bold text-[#fbbf24]">
                    Bước 3: Cấu hình bản ghi CNAME tại Mắt Bão / Nhân Hòa / Tenten / PA Việt Nam
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 font-mono text-xs pt-1">
                    <div className="sm:col-span-4 bg-[#0b0e14] border border-[#263042] p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-[#94a3b8]">
                          HOST / TÊN RECORD
                        </div>
                        <div className="font-bold text-[#6ee7b7]">
                          {parsedPreview.subdomainHost}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyText('host', parsedPreview.subdomainHost)
                        }
                        className="pixel-stone-button px-2 py-1 text-[10px] text-[#cbd5e1] cursor-pointer"
                      >
                        {copiedKey === 'host' ? 'Đã Chép' : 'Copy'}
                      </button>
                    </div>

                    <div className="sm:col-span-3 bg-[#0b0e14] border border-[#263042] p-2.5">
                      <div className="text-[10px] text-[#94a3b8]">
                        LOẠI (TYPE)
                      </div>
                      <div className="font-bold text-[#fbbf24]">CNAME</div>
                    </div>

                    <div className="sm:col-span-5 bg-[#0b0e14] border border-[#263042] p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#94a3b8]">
                          GIÁ TRỊ (VALUE)
                        </div>
                        <div className="font-bold text-[#38bdf8] whitespace-nowrap">
                          ghs.googlehosted.com
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText('cname', 'ghs.googlehosted.com')}
                        className="pixel-stone-button px-2 py-1 text-[10px] text-[#cbd5e1] cursor-pointer shrink-0"
                      >
                        {copiedKey === 'cname' ? 'Đã Chép' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
