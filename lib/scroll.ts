// No celular a página não rola: quem rola é a área de conteúdo (.content), e a barra de baixo fica fixa de verdade.
// (O Safari do iPhone às vezes "solta" elementos position:fixed e mostra um vão em branco embaixo.)
// Estas funções rolam o lugar certo nos dois casos (celular e computador).

export function scroller(): HTMLElement {
  const c = document.querySelector('.content') as HTMLElement | null;
  if (c && /(auto|scroll)/.test(getComputedStyle(c).overflowY)) return c;
  return (document.scrollingElement || document.documentElement) as HTMLElement;
}
export const scrollTopNow = () => scroller().scrollTop;
export const scrollToY = (top: number, smooth = false) => scroller().scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
export const scrollByY = (top: number) => scroller().scrollBy({ top, behavior: 'smooth' });
export const scrollToEnd = () => {
  const el = scroller();
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
};
