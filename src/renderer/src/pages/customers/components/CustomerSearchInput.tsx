interface CustomerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function CustomerSearchInput({ value, onChange, onClear }: CustomerSearchInputProps) {
  return (
    <div className="field customer-search">
      <label htmlFor="customer-search">Pesquisar clientes</label>
      <div className="input-with-action">
        <input
          id="customer-search"
          type="search"
          value={value}
          placeholder="Nome, CPF/CNPJ, e-mail ou telefone"
          onChange={(event) => onChange(event.target.value)}
        />
        {value ? (
          <button className="button button--ghost" type="button" onClick={onClear}>
            Limpar pesquisa
          </button>
        ) : null}
      </div>
    </div>
  );
}
