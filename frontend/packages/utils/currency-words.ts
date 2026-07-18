const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function hundreds(value: number): string {
  if (value === 100) return 'cem';
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  if (hundred) parts.push(HUNDREDS[hundred]);
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
  else {
    const ten = Math.floor(rest / 10);
    const unit = rest % 10;
    if (ten) parts.push(TENS[ten]);
    if (unit) parts.push(UNITS[unit]);
  }
  return parts.join(' e ');
}

function integerWords(value: number): string {
  if (value === 0) return 'zero';
  const groups = [
    { divisor: 1_000_000, singular: 'milhão', plural: 'milhões' },
    { divisor: 1_000, singular: 'mil', plural: 'mil' },
    { divisor: 1, singular: '', plural: '' },
  ];
  let remainder = value;
  const parts: string[] = [];
  for (const group of groups) {
    const quantity = Math.floor(remainder / group.divisor);
    remainder %= group.divisor;
    if (!quantity) continue;
    if (group.divisor === 1_000 && quantity === 1) parts.push('mil');
    else {
      const label = quantity === 1 ? group.singular : group.plural;
      parts.push([hundreds(quantity), label].filter(Boolean).join(' '));
    }
  }
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`;
}

export function parseBrl(value: string): number | null {
  const normalized = value.trim().replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.');
  if (!normalized || !/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function brlAmountInWords(amount: number): string {
  const centsTotal = Math.round(amount * 100);
  const reais = Math.floor(centsTotal / 100);
  const cents = centsTotal % 100;
  const parts: string[] = [];
  if (reais || !cents) parts.push(`${integerWords(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (cents) parts.push(`${integerWords(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`);
  return parts.join(' e ');
}

export function formatBrl(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}
