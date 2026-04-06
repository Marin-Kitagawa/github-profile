// @ts-check

import { encodeHTML } from "./html.js";
import { flexLayout } from "./render.js";

class Card {
  /**
   * Creates a new card instance.
   *
   * @param {object} args Card arguments.
   * @param {number=} args.width Card width.
   * @param {number=} args.height Card height.
   * @param {number=} args.border_radius Card border radius.
   * @param {string=} args.customTitle Card custom title.
   * @param {string=} args.defaultTitle Card default title.
   * @param {string=} args.titlePrefixIcon Card title prefix icon.
   * @param {object} [args.colors={}] Card colors arguments.
   * @param {string=} args.colors.titleColor Card title color.
   * @param {string=} args.colors.textColor Card text color.
   * @param {string=} args.colors.iconColor Card icon color.
   * @param {string|string[]=} args.colors.bgColor Card background color.
   * @param {string=} args.colors.borderColor Card border color.
   */
  constructor({
    width = 100,
    height = 100,
    border_radius = 4.5,
    colors = {},
    darkColors = null,
    customTitle,
    defaultTitle = "",
    titlePrefixIcon,
  }) {
    this.width = width;
    this.height = height;

    this.hideBorder = false;
    this.hideTitle = false;

    this.border_radius = border_radius;

    // returns theme based colors with proper overrides and defaults
    this.colors = colors;
    // optional dark-mode color overrides (used for prefers-color-scheme media query)
    this.darkColors = darkColors;
    this.title =
      customTitle === undefined
        ? encodeHTML(defaultTitle)
        : encodeHTML(customTitle);

    this.css = "";
    this.darkCSS = "";

    this.paddingX = 25;
    this.paddingY = 35;
    this.titlePrefixIcon = titlePrefixIcon;
    this.animations = true;
    this.a11yTitle = "";
    this.a11yDesc = "";
  }

  /**
   * @returns {void}
   */
  disableAnimations() {
    this.animations = false;
  }

  /**
   * @param {Object} props The props object.
   * @param {string} props.title Accessibility title.
   * @param {string} props.desc Accessibility description.
   * @returns {void}
   */
  setAccessibilityLabel({ title, desc }) {
    this.a11yTitle = title;
    this.a11yDesc = desc;
  }

  /**
   * @param {string} value The CSS to add to the card.
   * @returns {void}
   */
  setCSS(value) {
    this.css = value;
  }

  /**
   * Sets additional CSS rules that are placed inside a
   * `@media (prefers-color-scheme: dark)` block, allowing the card to adapt
   * automatically when the viewer's OS is in dark mode.
   *
   * These rules are merged with the structural dark overrides generated from
   * `this.darkColors` (if provided).
   *
   * @param {string} value Dark-mode CSS overrides.
   * @returns {void}
   */
  setDarkCSS(value) {
    this.darkCSS = value;
  }

  /**
   * @param {boolean} value Whether to hide the border or not.
   * @returns {void}
   */
  setHideBorder(value) {
    this.hideBorder = value;
  }

  /**
   * @param {boolean} value Whether to hide the title or not.
   * @returns {void}
   */
  setHideTitle(value) {
    this.hideTitle = value;
    if (value) {
      this.height -= 30;
    }
  }

  /**
   * @param {string} text The title to set.
   * @returns {void}
   */
  setTitle(text) {
    this.title = text;
  }

  /**
   * @returns {string} The rendered card title.
   */
  renderTitle() {
    const titleText = `
      <text
        x="0"
        y="0"
        class="header"
        data-testid="header"
      >${this.title}</text>
    `;

    const prefixIcon = `
      <svg
        class="icon"
        x="0"
        y="-13"
        viewBox="0 0 16 16"
        version="1.1"
        width="16"
        height="16"
      >
        ${this.titlePrefixIcon}
      </svg>
    `;
    return `
      <g
        data-testid="card-title"
        transform="translate(${this.paddingX}, ${this.paddingY})"
      >
        ${flexLayout({
          items: [this.titlePrefixIcon ? prefixIcon : "", titleText],
          gap: 25,
        }).join("")}
      </g>
    `;
  }

  /**
   * @returns {string} The rendered card gradient.
   */
  renderGradient() {
    if (typeof this.colors.bgColor !== "object") {
      return "";
    }

    const gradients = this.colors.bgColor.slice(1);
    return typeof this.colors.bgColor === "object"
      ? `
        <defs>
          <linearGradient
            id="gradient"
            gradientTransform="rotate(${this.colors.bgColor[0]})"
            gradientUnits="userSpaceOnUse"
          >
            ${gradients.map((grad, index) => {
              let offset = (index * 100) / (gradients.length - 1);
              return `<stop offset="${offset}%" stop-color="#${grad}" />`;
            })}
          </linearGradient>
        </defs>
        `
      : "";
  }

  /**
   * Retrieves css animations for a card.
   *
   * @returns {string} Animation css.
   */
  getAnimations = () => {
    return `
      /* Animations */
      @keyframes scaleInAnimation {
        from {
          transform: translate(-5px, 5px) scale(0);
        }
        to {
          transform: translate(-5px, 5px) scale(1);
        }
      }
      @keyframes fadeInAnimation {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
  };

  /**
   * Builds a `@media (prefers-color-scheme: dark)` CSS block from `this.darkColors`
   * and `this.darkCSS`, enabling automatic dark-mode switching when the card is
   * embedded as an `<img>` in GitHub Markdown.
   *
   * @returns {string} Dark-mode CSS block, or empty string when not configured.
   */
  getDarkModeStyles() {
    if (!this.darkColors && !this.darkCSS) return "";

    const structural = this.darkColors
      ? `
        .header { fill: ${this.darkColors.titleColor} !important; }
        [data-testid="card-bg"] {
          fill: ${
            typeof this.darkColors.bgColor === "object"
              ? "url(#gradient-dark)"
              : this.darkColors.bgColor
          } !important;
          stroke: ${this.darkColors.borderColor} !important;
        }
      `
      : "";

    return `
      @media (prefers-color-scheme: dark) {
        ${structural}
        ${this.darkCSS}
      }
    `;
  }

  /**
   * Renders a `<linearGradient id="gradient-dark">` for the dark-mode background
   * when `this.darkColors.bgColor` is an array (gradient).
   *
   * @returns {string} SVG defs fragment, or empty string when not needed.
   */
  renderDarkGradient() {
    if (
      !this.darkColors ||
      typeof this.darkColors.bgColor !== "object"
    ) {
      return "";
    }

    const gradients = this.darkColors.bgColor.slice(1);
    return `
      <linearGradient
        id="gradient-dark"
        gradientTransform="rotate(${this.darkColors.bgColor[0]})"
        gradientUnits="userSpaceOnUse"
      >
        ${gradients.map((grad, index) => {
          const offset = (index * 100) / (gradients.length - 1);
          return `<stop offset="${offset}%" stop-color="#${grad}" />`;
        })}
      </linearGradient>
    `;
  }

  /**
   * @param {string} body The inner body of the card.
   * @returns {string} The rendered card.
   */
  render(body) {
    const hasGradient =
      typeof this.colors.bgColor === "object" ||
      (this.darkColors && typeof this.darkColors.bgColor === "object");

    return `
      <svg
        width="${this.width}"
        height="${this.height}"
        viewBox="0 0 ${this.width} ${this.height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="descId"
      >
        <title id="titleId">${this.a11yTitle}</title>
        <desc id="descId">${this.a11yDesc}</desc>
        <style>
          .header {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: ${this.colors.titleColor};
            animation: fadeInAnimation 0.8s ease-in-out forwards;
          }
          @supports(-moz-appearance: auto) {
            /* Selector detects Firefox */
            .header { font-size: 15.5px; }
          }
          ${this.css}

          ${process.env.NODE_ENV === "test" ? "" : this.getAnimations()}
          ${
            this.animations === false
              ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
              : ""
          }

          ${this.getDarkModeStyles()}
        </style>

        ${hasGradient
          ? `<defs>
              ${this.renderGradient().replace(/<defs>|<\/defs>/g, "")}
              ${this.renderDarkGradient()}
            </defs>`
          : this.renderGradient()
        }

        <rect
          data-testid="card-bg"
          x="0.5"
          y="0.5"
          rx="${this.border_radius}"
          height="99%"
          stroke="${this.colors.borderColor}"
          width="${this.width - 1}"
          fill="${
            typeof this.colors.bgColor === "object"
              ? "url(#gradient)"
              : this.colors.bgColor
          }"
          stroke-opacity="${this.hideBorder ? 0 : 1}"
        />

        ${this.hideTitle ? "" : this.renderTitle()}

        <g
          data-testid="main-card-body"
          transform="translate(0, ${
            this.hideTitle ? this.paddingX : this.paddingY + 20
          })"
        >
          ${body}
        </g>
      </svg>
    `;
  }
}

export { Card };
export default Card;
