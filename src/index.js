function typeOf(v) {
  return Object.prototype.toString.call(v).slice(8, -1).toLowerCase();
}

function isIncluded(include, filename) {
  if (include) {
    switch (typeOf(include)) {
      case 'string':
        return include === filename;
      case 'regexp':
        return include.test(filename);
      case 'function':
        return include(filename);
      case 'array':
        var included = false;
        include.some(function(e) {
          return (included = isIncluded(e, filename));
        });
        return included;
      default:
        return false;
    }
  } else {
    return false;
  }
}

function extendsRaxComponent(node) {
  return node.superClass &&
    (node.superClass.name === 'Component' || ( // extends Component
      node.superClass.object &&
      node.superClass.property &&
      node.superClass.object.name === 'Rax' &&
      node.superClass.property.name === 'Component' // extends Rax.Component
    ));
}

module.exports = function(babel, options = {}) {
  const { types } = babel;
  const { hydrate = false, include, root = '#root' } = options;

  function hasRenderApp(path) {
    let ret = false;

    path.node.body.some(function(statement) {
      if (
        types.isExpressionStatement(statement) &&
        types.isCallExpression(statement.expression) &&
        statement.expression.callee &&
        statement.expression.callee.name === 'render'
      ) {
        return (ret = true);
      }
    });

    return ret;
  }

  function addRenderApp(path) {
    // import rax
    if (path.importedRax) {
      // import {Component} from 'rax';
      // import {Component, createElement, render} from 'rax';
      if (!path.hasRaxCreateElementImported) {
        path.importedRax.node.specifiers.push(types.importSpecifier(
          types.identifier('createElement'),
          types.identifier('createElement')
        ));
      }
      if (!path.hasRaxRenderImported) {
        path.importedRax.node.specifiers.push(types.importSpecifier(
          types.identifier('render'),
          types.identifier('render')
        ));
      }
    } else {
      // import {createElement, render} from 'rax';
      path.node.body.unshift(types.importDeclaration([
        types.importSpecifier(
          types.identifier('createElement'),
          types.identifier('createElement')
        ),
        types.importSpecifier(
          types.identifier('render'),
          types.identifier('render')
        )
      ], types.stringLiteral('rax')))
    }

    // import driver
    path.node.body.unshift(types.importDeclaration([
      types.importDefaultSpecifier(types.identifier('__driver'))
    ], types.stringLiteral('driver-universal')));

    // var __root = document.querySelector && document.querySelector('#root') || null;
    // var __hydrate = __root && __root.hasAttribute('data-hydrate') || false;
    // render(createElement(App), __root, {
    //   driver: __driver,
    //   hydrate: false || __hydrate
    // });
    path.node.body.push(types.variableDeclaration(
      'var',
      [
        types.variableDeclarator(
          types.identifier('__root'),
          types.logicalExpression(
            '||',
            types.logicalExpression(
              '&&',
              types.memberExpression(
                types.identifier('document'),
                types.identifier('querySelector')
              ),
              types.callExpression(
                types.memberExpression(
                  types.identifier('document'),
                  types.identifier('querySelector')
                ),
                [types.stringLiteral(root)]
              )
            ),
            types.nullLiteral()
          )
        )
      ]
    ));
    path.node.body.push(types.variableDeclaration(
      'var',
      [
        types.variableDeclarator(
          types.identifier('__hydrate'),
          types.logicalExpression(
            '||',
            types.logicalExpression(
              '&&',
              types.identifier('__root'),
              types.callExpression(
                types.memberExpression(
                  types.identifier('__root'),
                  types.identifier('hasAttribute')
                ),
                [types.stringLiteral('data-hydrate')]
              )
            ),
            types.booleanLiteral(false)
          )
        )
      ]
    ));
    path.node.body.push(types.expressionStatement(
      types.callExpression(
        types.identifier('render'),
        [
          types.callExpression(
            types.identifier('createElement'),
            [types.identifier(path.exportedAppName)]
          ),
          types.identifier('__root'),
          types.objectExpression([
            types.objectProperty(
              types.identifier('driver'),
              types.identifier('__driver')
            ),
            types.objectProperty(
              types.identifier('hydrate'),
              types.logicalExpression(
                '||',
                types.booleanLiteral(hydrate),
                types.identifier('__hydrate')
              )
            )
          ])
        ]
      )
    ));
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          path.hasRaxCreateElementImported = false;
          path.hasRaxRenderImported = false;
          path.exportedAppName = '';
          path.importedRax = null;
          path.ignoreFile = false;
          if (!isIncluded(
            include || (state.opts && state.opts.include),
            this.file.opts.filename
          )) path.ignoreFile = true;
        },
        exit(path) {
          if (path.ignoreFile || !path.exportedAppName || hasRenderApp(path)) return;
          addRenderApp(path);
        }
      },
      ImportDeclaration(path) {
        const { node } = path;
        const rootPath = path.findParent(p => p.isProgram());
        if (node.source.value === 'rax') {
          node.specifiers.forEach(function(s) {
            if (s.imported) {
              if (s.imported.name === 'render') {
                rootPath.hasRaxRenderImported = true;
              }
              if (s.imported.name === 'createElement') {
                rootPath.hasRaxCreateElementImported = true;
              }
            }
          });
          rootPath.importedRax = path;
        }
      },
      ExportDefaultDeclaration(path) {
        const node = path.node;
        const rootPath = path.findParent(p => p.isProgram());
        let declaration = node.declaration;
        if (
          !rootPath.ignoreFile && (
            types.isFunctionDeclaration(declaration) || // export default function App() {}
            types.isIdentifier(declaration) || // export default App;
            (types.isClassDeclaration(declaration) && extendsRaxComponent(declaration)) // export default class App extends Component/Rax.Component {}
          )
        ) {
          rootPath.exportedAppName = declaration.name || declaration.id.name;
        }
      }
    }
  }
}
