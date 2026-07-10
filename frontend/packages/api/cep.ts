/** CEP lookup adapter — isolated external boundary, never authoritative. */

export type CepLookupResult = {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
  provider: "viacep";
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function lookupCep(zipCode: string, opts?: { signal?: AbortSignal }): Promise<CepLookupResult> {
  const normalized = zipCode.replace(/\D/g, "");
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  const externalSignal = opts?.signal;
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Não foi possível consultar o CEP.");

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro) throw new Error("CEP não encontrado.");

    return {
      zipCode: data.cep ?? normalized,
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
      provider: "viacep",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
