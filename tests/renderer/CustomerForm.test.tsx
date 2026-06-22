import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerForm } from '@renderer/pages/customers/components/CustomerForm';

describe('CustomerForm', () => {
  it('renders individual person fields initially', () => {
    render(<CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Tipo de pessoa *')).toHaveValue('FISICA');
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument();
    expect(screen.getByLabelText('CPF')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de nascimento')).toBeInTheDocument();
  });

  it('switches to company fields', () => {
    render(<CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Tipo de pessoa *'), {
      target: { value: 'JURIDICA' }
    });

    expect(screen.getByLabelText('Razão social *')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome fantasia')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument();
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();
  });

  it('validates required name', async () => {
    render(<CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome do cliente.')).toBeInTheDocument();
  });

  it('validates email, CPF, CNPJ and state', async () => {
    render(<CustomerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'M' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('O CPF deve conter 11 dígitos.')).toBeInTheDocument();
    expect(screen.getByText('O estado deve conter duas letras.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tipo de pessoa *'), {
      target: { value: 'JURIDICA' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O CNPJ deve conter 14 dígitos.')).toBeInTheDocument();
  });

  it('normalizes values before submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CustomerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: ' Maria Silva ' } });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '123.456.789-00' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' MARIA@EXAMPLE.COM ' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(31) 99999-9999' } });
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '12345-678' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'mg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        legalName: 'Maria Silva',
        taxId: '12345678900',
        email: 'maria@example.com',
        phone: '31999999999',
        postalCode: '12345678',
        state: 'MG',
        tradeName: null,
        active: true
      })
    );
  });

  it('prevents duplicate submit while saving', async () => {
    const onSubmit = vi.fn(() => new Promise<void>(() => undefined));
    render(<CustomerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Maria Silva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('button', { name: 'Salvando...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvando...' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('cancels immediately without changes', () => {
    const onCancel = vi.fn();
    render(<CustomerForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirms cancel with unsaved changes', () => {
    const onCancel = vi.fn();
    render(<CustomerForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Maria Silva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: 'Cancelar edição' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
