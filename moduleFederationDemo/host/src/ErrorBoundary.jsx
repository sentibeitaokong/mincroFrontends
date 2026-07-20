import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error" role="alert">
          <strong>远程模块加载失败</strong>
          <span>请确认 Remote 已在 3001 端口启动，然后刷新页面。</span>
        </div>
      );
    }

    return this.props.children;
  }
}
