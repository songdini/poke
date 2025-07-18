// web-vitals 최신 버전(5.x)에서는 함수명이 변경되었습니다
// getCLS → onCLS, getFCP → onFCP, getLCP → onLCP, getTTFB → onTTFB
// getFID는 제거되고 onINP로 대체되었습니다
type ReportHandler = (metric: any) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onFCP(onPerfEntry);
      onINP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
