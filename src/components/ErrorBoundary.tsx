import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#0B0D14] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl bg-[#131826] border border-white/12 p-6 shadow-2xl">
            <h1 className="font-display font-extrabold text-3xl text-[#FF5E7E]">
              Something Went Wrong
            </h1>
            <p className="mt-2 text-sm text-slate-300 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] font-bold text-sm transition-colors cursor-pointer"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
