import { THEME_KEY } from "./theme-store";

/**
 * Applies a visitor's remembered theme before the page paints, so a visitor
 * who chose light never sees a dark flash. The server renders the site
 * default on <html data-theme>; this only overrides it.
 */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
