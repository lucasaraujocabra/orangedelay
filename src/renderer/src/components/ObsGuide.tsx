import { useState, type ReactNode } from 'react'
import { Copy, Check, KeyRound, Radio } from 'lucide-react'

interface Props {
  rtmpPort: number
}

/**
 * "COMO CONFIGURAR NO OBS" — passo a passo dentro do app, sempre à mão no
 * dashboard. Mostra o servidor localhost com botão de copiar e deixa claro
 * que a stream key REAL da Twitch vai no OrangeDelay, não no OBS.
 */
export function ObsGuide({ rtmpPort }: Props): JSX.Element {
  const serverUrl = `rtmp://localhost:${rtmpPort}/live`
  const [copied, setCopied] = useState(false)

  function copy(): void {
    navigator.clipboard.writeText(serverUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-xs text-muted leading-relaxed">
        O OBS envia o vídeo pro OrangeDelay (aqui no seu PC), e o app reenvia pra Twitch com o
        delay. Configure o OBS assim:
      </p>

      {/* passos */}
      <ol className="flex flex-col gap-3">
        <Step n="01">
          Abre o <span className="text-white">OBS</span> → <span className="text-white">Configurações</span>{' '}
          → aba <span className="text-white">Transmissão</span>
        </Step>
        <Step n="02">
          Em <span className="text-white">Serviço</span>, escolhe{' '}
          <span className="text-energy font-bold">Personalizado...</span>
        </Step>

        {/* servidor com copiar */}
        <Step n="03">
          <div className="flex flex-col gap-2">
            <span>
              Em <span className="text-white">Servidor</span>, cola:
            </span>
            <div className="flex items-center border border-edge bg-void rounded-pixel">
              <code className="flex-1 px-3 py-2 font-mono text-sm text-energy truncate">
                {serverUrl}
              </code>
              <button
                onClick={copy}
                className="px-3 py-2 text-muted hover:text-energy border-l border-edge"
                title="copiar"
              >
                {copied ? <Check size={15} className="text-live" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </Step>

        <Step n="04">
          Em <span className="text-white">Chave de transmissão</span>, põe{' '}
          <span className="text-white">qualquer coisa</span> (ex:{' '}
          <span className="font-mono text-neutral-300">obs</span>)
        </Step>
        <Step n="05">
          Clica <span className="text-white">OK / Aplicar</span>
        </Step>
      </ol>

      {/* destaque: key real vai no Orange */}
      <div className="corner border border-energy/50 bg-[#140a05] rounded-pixel p-3 flex gap-3">
        <KeyRound size={16} className="text-energy shrink-0 mt-0.5" />
        <p className="font-mono text-[12px] text-neutral-200 leading-relaxed">
          A <span className="text-white font-bold">chave REAL da Twitch</span> (live_xxxx) vai aqui
          no OrangeDelay, na seção acima — <span className="text-white">não no OBS</span>. No OBS a
          key é só um valor qualquer.
        </p>
      </div>

      {/* ir ao ar */}
      <div className="border-t border-edge pt-4 flex flex-col gap-3">
        <span className="label-mono">DEPOIS DE CONFIGURAR</span>
        <ol className="flex flex-col gap-3">
          <Step n="06">
            No OBS, clica <span className="text-white">Iniciar Transmissão</span> → aqui em cima
            aparece <span className="text-live font-bold">OBS CONECTADO</span> e a TAXA_ENTRADA sobe
          </Step>
          <Step n="07">
            Escolhe o delay e clica{' '}
            <span className="text-energy font-bold">ENTRAR NO AR</span> → você está na Twitch com o
            delay <Radio size={12} className="inline text-energy" />
          </Step>
        </ol>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: string; children: ReactNode }): JSX.Element {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 border border-energy/60 rounded-pixel grid place-items-center font-mono text-[11px] text-energy">
        {n}
      </span>
      <div className="font-mono text-[13px] text-neutral-400 leading-relaxed pt-1">{children}</div>
    </li>
  )
}
