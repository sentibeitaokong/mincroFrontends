import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-card" role="alert">
          <strong>Remote 组件加载失败</strong>
          <span>请确认 Remote 已运行在 4174 端口，然后刷新页面。</span>
          <code>{this.state.error.message}</code>
        </div>
      );
    }

    return this.props.children;
  }
}

