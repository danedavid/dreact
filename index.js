const createElement = (type, props, ...children) => ({
  type,
  props: props || {},
  children
});

const render = (vdom, parent = null) => {

  const mount = el => parent ? parent.appendChild(el) : el;

  if ( typeof vdom === 'string' || typeof vdom === 'number' ) {
    // text nodes
    return mount(document.createTextNode(vdom));
  } else if ( typeof vdom === 'boolean' || vdom === null ) {
    // empty nodes
    return mount(document.createTextNode(''));
  } else if ( typeof vdom === 'object' && typeof vdom.type === 'function' ) {
    // component nodes
    return mount(Component.render(vdom));
  } else if ( typeof vdom === 'object' && typeof vdom.type === 'string' ) {
    // DOM nodes
    const domEl = document.createElement(vdom.type);

    for ( let child of [].concat(...vdom.children) ) {
      render(child, domEl);
    }
    for ( let propKey in vdom.props ) {
      setAttribute(domEl, propKey, vdom.props[propKey]);
    }
    return mount(domEl);
  } else {
    throw new Error(`Invalid VDOM: ${vdom}`);
  }
};

const setAttribute = (domEl, propKey, propValue) => {
  if ( typeof propValue === 'function' && propKey.startsWith('on') ) {
    // event listeners
    const eventType = propKey.slice(2).toLowerCase();
    domEl.__dreactHandlers = domEl.__dreactHandlers || {};
    domEl.removeEventListener(eventType, domEl.__dreactHandlers[eventType]);
    domEl.__dreactHandlers[eventType] = propValue;
    domEl.addEventListener(eventType, domEl.__dreactHandlers[eventType]);
  } else if ( ['checked', 'value', 'id'].includes(propKey) ) {
    // DOM properties
    domEl[propKey] = propValue;
  } else if ( propKey === 'key' ) {
    // dreact key
    domEl.__dreactKey = value;
  } else if ( typeof propValue !== 'object' && typeof propValue !== 'function' ) {
    // all other attributes 
    if ( propKey === 'className' ) {
      domEl.setAttribute('class', propValue);
    } else {
      domEl.setAttribute(propKey, propValue);
    }
  }
};

const patch = (dom, vdom, parent = dom.parentNode) => {
  const replace = el => parent.replaceChild(el, dom) && el;

  if ( typeof vdom === 'object' && typeof vdom.type === 'function' ) {
    return Component.patch(dom, vdom, parent);
  } else if ( typeof vdom !== 'object' && dom instanceof Text ) {
    return dom.textContent !== vdom ? replace(render(vdom)) : dom;
  } else if ( typeof vdom === 'object' && dom instanceof Text ) {
    return replace(render(vdom));
  } else if ( typeof vdom === 'object' && dom.nodeName !== vdom.type.toUpperCase() ) {
    return replace(render(vdom));
  } else if ( typeof vdom === 'object' && dom.nodeName === vdom.type.toUpperCase() ) {
    const pool = {};
    const active = document.activeElement;

    for ( const index in Array.from(dom.childNodes) ) {
      const child = dom.childNodes[index];
      const key = child.__dreactKey || index;
      pool[key] = child;
    }

    const vchildren = [].concat(...vdom.children);

    for ( const index in vchildren ) {
      const child = vchildren[index];
      const key = (child.props && child.props.key) || index;
      dom.appendChild(pool[key] ? patch(pool[key], child) : render(child));
      delete pool[key];
    }

    for ( const key in pool ) {
      if ( pool[key].__dreactInstance ) {
        pool[key].__dreactInstance.componentWillUnmount();
      }
      pool[key].remove();
    }

    for ( const attr of dom.attributes ) {
      dom.removeAttribute(attr.name);
    }
    for ( const prop in vdom.props ) {
      setAttribute(dom, prop, vdom.props[prop]);
    }

    active.focus();
    return dom;
  }
};

class Component {
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }

  static render(vdom, parent = null) {
    const props = Object.assign(
      {},
      vdom.props,
      { children: vdom.children }
    );

    if ( Component.isPrototypeOf(vdom.type) ) {
      const instance = new (vdom.type)(props);

      instance.componentWillMount();
      instance.base = render(instance.render(), parent);
      instance.base.__dreactInstance = instance;
      instance.base.__dreactKey = vdom.props.key || null;
      instance.componentDidMount();
      return instance.base;
    } else {
      return render(vdom.type(props), parent);
    }
  }

  static patch(dom, vdom, parent = dom.parentNode) {
    const props = Object.assign(
      {},
      vdom.props,
      { children: vdom.children }
    );

    if ( dom.__dreactInstance && dom.__dreactInstance.prototype === vdom.type ) {
      dom.__dreactInstance.componentWillReceiveProps(props);
      dom.__dreactInstance.props = props;
      return patch(dom, dom.__dreactInstance.render());
    } else if ( Component.isPrototypeOf(vdom.type) ) {
      const ndom = Component.render(vdom);
      return parent.replaceChild(ndom, dom) && ndom;
    } else if ( !Component.isPrototypeOf(vdom.type) ) {
      return patch(dom, vdom.type(props));
    }
  }

  setState(nextState) {
    if ( this.base && this.shouldComponentUpdate(this.props, nextState) ) {
      const prevState = this.state;
      this.componentWillUpdate(this.props, nextState);
      this.state = nextState;
      patch(this.base, this.render());
      this.componentDidUpdate(this.props, prevState);
    } else {
      this.state = nextState;
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  componentWillReceiveProps(nextProps) {
    return undefined;
  }

  componentWillUpdate(nextProps, nextState) {
    return undefined;
  }

  componentDidUpdate(prevProps, prevState) {
    return undefined;
  }

  componentWillMount() {
    return undefined;
  }

  componentDidMount() {
    return undefined;
  }

  componentWillUnmount() {
    return undefined;
  }
}
