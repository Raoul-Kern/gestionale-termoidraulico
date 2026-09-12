import { NextResponse, type NextRequest } from 'next/server'
import { clientServer } from '@/lib/supabase/server'
import { calcolaTotali } from '@/lib/calcoli'
import { generaCsv, type RigaExport } from '@/lib/export'

export async function GET(request: NextRequest) {
  const dal = request.nextUrl.searchParams.get('dal') ?? '1900-01-01'
  const al = request.nextUrl.searchParams.get('al') ?? '2999-12-31'

  const supabase = await clientServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorizzato', { status: 401 })

  const { data, error } = await supabase
    .from('rapportini')
    .select(
      `id, chiuso_il,
       interventi!inner ( data, descrizione, sedi ( clienti ( ragione_sociale, partita_iva ) ) ),
       rapportino_ore ( tipo, minuti, prezzo_orario ),
       rapportino_materiali ( quantita, prezzo_vendita )`,
    )
    .gte('interventi.data', dal)
    .lte('interventi.data', al)
    .order('chiuso_il', { ascending: true })

  if (error) return new NextResponse(error.message, { status: 500 })

  const righe: RigaExport[] = (data ?? []).map((rapportino, indice) => {
    const ore = rapportino.rapportino_ore ?? []
    const materiali = rapportino.rapportino_materiali ?? []
    const totali = calcolaTotali(
      ore.map((riga) => ({ ...riga, prezzo_orario: Number(riga.prezzo_orario) })),
      materiali.map((riga) => ({
        quantita: Number(riga.quantita),
        prezzo_vendita: Number(riga.prezzo_vendita),
      })),
    )
    const anno = (rapportino.interventi?.data ?? '').slice(0, 4)

    return {
      numero: `RAP-${anno}-${String(indice + 1).padStart(4, '0')}`,
      data: rapportino.interventi?.data ?? '',
      cliente: rapportino.interventi?.sedi?.clienti?.ragione_sociale ?? '',
      partita_iva: rapportino.interventi?.sedi?.clienti?.partita_iva ?? null,
      descrizione: rapportino.interventi?.descrizione ?? '',
      ore: ore.reduce((somma, riga) => somma + riga.minuti, 0) / 60,
      importo_ore: totali.ricavoOre,
      importo_materiali: totali.ricavoMateriali,
      totale: totali.totale,
    }
  })

  return new NextResponse(generaCsv(righe), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rapportini-${dal}_${al}.csv"`,
    },
  })
}
