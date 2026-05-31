const PROCESSOR_PREFIXES = [
  /^TST\*\s*/i,
  /^SQ\s*\*\s*/i,
  /^SP\s+/i,
  /^PAYPAL\s*\*\s*/i,
  /^PP\*\s*/i,
  /^POS\s+PURCHASE\s*/i,
  /^DEBIT\s+CARD\s+PURCHASE\s*/i,
  /^CARD\s+PURCHASE\s*/i,
  /^CHECKCARD\s*/i,
];

const TRAILING_NOISE_PATTERNS = [
  /\b\d{2}\/\d{2}(?:\/\d{2,4})?$/i,
  /\b\d{4,}$/i,
  /\b[A-Z]{2}\s*\d{3,}$/i,
  /\b[A-Z]{2}$/i,
  /\b(USA|US|ONLINE|WEB|MOBILE|AUTOPAY|RECURRING)$/i,
];

function titleCaseWord(word: string): string {
  if (!word) {
    return word;
  }

  return word
    .toLowerCase()
    .replace(/(^|[-&])([a-z])/g, (_, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizePayeeName(
  rawPayee: string | null | undefined,
): string {
  if (!rawPayee) {
    return '';
  }

  let value = rawPayee.replace(/[…]+/g, '...');
  const wasTruncated = value.includes('...');

  value = value
    .replace(/\s+/g, ' ')
    .replace(/\s+\.\.\.$/, '...')
    .replace(/\.\.\.$/, '')
    .trim();

  for (const prefix of PROCESSOR_PREFIXES) {
    value = value.replace(prefix, '');
  }

  value = value
    .replace(/\bHTTPS?:\/\/\S+/gi, '')
    .replace(/\b[A-Z0-9.-]+\.(COM|NET|ORG|IO)\b/gi, '')
    .replace(/[•·]/g, ' ')
    .replace(/\s+-\s+/g, ' ');

  value = normalizeWhitespace(value);

  // Common card feeds truncate "Pub" as "PU...". Preserve the useful merchant.
  if (wasTruncated && /\bpu$/i.test(value)) {
    value = value.replace(/\bpu$/i, 'Pub');
  }

  for (const pattern of TRAILING_NOISE_PATTERNS) {
    value = normalizeWhitespace(value.replace(pattern, ''));
  }

  return normalizeWhitespace(value).split(' ').map(titleCaseWord).join(' ');
}
