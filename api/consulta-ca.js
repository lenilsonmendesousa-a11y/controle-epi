export default function handler(req, res) {
  res.status(501).json({
    erro: 'Integração automática com CAEPI ainda não configurada.',
    validadeCA: null
  })
}
