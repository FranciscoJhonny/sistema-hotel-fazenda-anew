-- Migration: Remover quantidadecamas e adicionar quantidadecamascasal e quantidadecamassolteiro com dados atualizados dos quartos
ALTER TABLE public.quarto DROP COLUMN IF EXISTS quantidadecamas;

ALTER TABLE public.quarto 
ADD COLUMN IF NOT EXISTS quantidadecamascasal INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantidadecamassolteiro INTEGER DEFAULT 0;

COMMENT ON COLUMN public.quarto.quantidadecamascasal IS 'Quantidade de camas de casal no quarto';
COMMENT ON COLUMN public.quarto.quantidadecamassolteiro IS 'Quantidade de camas de solteiro no quarto';

-- Atualizar dados das acomodações conforme especificação:

-- Bloco B
-- B1, B2, B3, B4: 1 CAMA DE CASAL E 1 DE SOLTEIRO
UPDATE public.quarto 
SET quantidadecamascasal = 1, quantidadecamassolteiro = 1 
WHERE codigoidentificador IN ('B1', 'B2', 'B3', 'B4') OR numero IN ('01', '02', '03', '04', '1', '2', '3', '4');

-- Bloco C
-- C2, C3, C4, C5: 1 CAMA DE CASAL E 2 DE SOLTEIRO
UPDATE public.quarto 
SET quantidadecamascasal = 1, quantidadecamassolteiro = 2 
WHERE codigoidentificador IN ('C2', 'C3', 'C4', 'C5') OR numero IN ('05', '06', '07', '5', '6', '7');

-- Bloco D
-- D1 (DUPLEX: EM CIMA 1 CAMA DE CASAL E EMBAIXO 2 CAMAS DE CASAL) -> 3 CASAL, 0 SOLTEIRO
UPDATE public.quarto 
SET quantidadecamascasal = 3, quantidadecamassolteiro = 0 
WHERE codigoidentificador = 'D1' OR numero IN ('08', '8');

-- D2, D3, D4, D5: 1 CAMA DE CASAL E 2 DE SOLTEIRO
UPDATE public.quarto 
SET quantidadecamascasal = 1, quantidadecamassolteiro = 2 
WHERE codigoidentificador IN ('D2', 'D3', 'D4', 'D5') OR numero IN ('09', '10', '11', '12', '9');

-- D6 (DUPLEX: EM CIMA 1 CAMA DE CASAL E 1 SOLTEIRO E EMBAIXO 1 CAMA DE CASAL E 1 DE SOLTEIRO) -> 2 CASAL, 2 SOLTEIRO
UPDATE public.quarto 
SET quantidadecamascasal = 2, quantidadecamassolteiro = 2 
WHERE codigoidentificador = 'D6' OR numero IN ('13');
