import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../App';

describe('Adaptive GraphQL Query-Cost Shield UI', () => {
  it('renders Attack Lab by default showing the 400x alias bypass detected', () => {
    render(<App />);
    expect(
      screen.getByText(/Adaptive GraphQL Query-Cost Shield/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI Baseline Bypass Detected!/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/COMPLEXITY_EXCEEDED\(80400\)/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('switches to Security Harness and displays 6/6 canonical tests passing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Security Harness/i }));

    expect(
      screen.getByText(/Automated Security Test Harness/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/6\/6 tests passing/i)).toBeInTheDocument();
  });

  it('loads a test payload from Security Harness into Attack Lab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Security Harness/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Inspect Payload in Attack Lab/i })
    );

    expect(
      screen.getByLabelText(/GraphQL Query Editor/i)
    ).toBeInTheDocument();
  });

  it('navigates across Benchmark, Policy Studio, and AI Audit tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /50-Req Benchmark/i }));
    expect(screen.getByText(/863\.4 ms/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Policy Studio/i }));
    expect(
      screen.getByText(/Shield Policy & Schema Cost Studio/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /AI Audit & Report/i }));
    expect(
      screen.getByText(/Critical Engineering Audit: 4 AI Baseline Flaws/i)
    ).toBeInTheDocument();
  });

  it('switches presets and GraphQL/JSON AST editor modes in Attack Lab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Fragment Depth 10/i }));
    expect(
      screen.getAllByText(/DEPTH_EXCEEDED\(10\)/i).length
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /Report AST JSON/i }));
    expect(
      screen.getByLabelText(/Report AST JSON Editor/i)
    ).toBeInTheDocument();
  });

  it('updates policy thresholds in Policy Studio and resets to report defaults', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Policy Studio/i }));

    const depthSlider = screen.getByLabelText('MAX_DEPTH');
    fireEvent.change(depthSlider, { target: { value: '12' } });
    expect(screen.getByText(/DEPTH ≤ 12/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Policy Active/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Reset to Report Defaults/i })
    );
    expect(screen.getByText(/DEPTH ≤ 6/i)).toBeInTheDocument();
  });

  it('switches Benchmark view to Live Browser Simulation and filters audit rows', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /50-Req Benchmark/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Live Browser Simulation/i })
    );

    expect(
      screen.getByText(/Traffic Mix & Attack Parameters/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Request-Level Audit Log \(50 rows\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alias Attack' }));
    expect(screen.getByText(/Request-Level Audit Log \(5 rows\)/i)).toBeInTheDocument();
  });
});
