import '@testing-library/jest-dom'

// antd 响应式组件依赖 matchMedia，jsdom 未实现，这里补一个桩
window.matchMedia =
  window.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
  }
