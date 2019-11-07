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
  const { include } = options;
  let hasRaxRenderImported = false;
  let hasRaxCreateElementImported = false;
  let exportedAppName = '';
  let importedRax = null;
  let ignoreFile = false;

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

  function addRenderApp(path, exportedAppName) {
    // import rax
    if (importedRax) {
      // import {Component} from 'rax';
      // import {Component, createElement, render} from 'rax';
      if (!hasRaxCreateElementImported) {
        importedRax.node.specifiers.push(types.importSpecifier(
          types.identifier('createElement'),
          types.identifier('createElement')
        ));
      }
      if (!hasRaxRenderImported) {
        importedRax.node.specifiers.push(types.importSpecifier(
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
      types.importDefaultSpecifier(types.identifier('Driver'))
    ], types.stringLiteral('driver-universal')));

    // render(createElement(App), null, { driver: Driver });
    path.node.body.push(types.expressionStatement(
      types.callExpression(
        types.identifier('render'),
        [
          types.callExpression(
            types.identifier('createElement'),
            [types.identifier(exportedAppName)]
          ),
          types.nullLiteral(),
          types.objectExpression([
            types.objectProperty(
              types.identifier('driver'),
              types.identifier('Driver')
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
          ignoreFile = false;
          exportedAppName = '';
          if (!isIncluded(
            include || (state.opts && state.opts.include),
            this.file.opts.filename
          )) ignoreFile = true;
        },
        exit(path) {
          if (ignoreFile || !exportedAppName || hasRenderApp(path)) return;
          addRenderApp(path, exportedAppName);
        }
      },
      ImportDeclaration(path) {
        const { node } = path;
        if (node.source.value === 'rax') {
          node.specifiers.forEach(function(s) {
            if (s.imported) {
              if (s.imported.name === 'render') {
                hasRaxRenderImported = true;
              }
              if (s.imported.name === 'createElement') {
                hasRaxCreateElementImported = true;
              }
            }
          });
          importedRax = path;
        }
      },
      ExportDefaultDeclaration(path) {
        const node = path.node;
        let declaration = node.declaration;
        if (
          !ignoreFile && (
            types.isFunctionDeclaration(declaration) || // export default function App() {}
            types.isIdentifier(declaration) || // export default App;
            (types.isClassDeclaration(declaration) && extendsRaxComponent(declaration)) // export default class App extends Component/Rax.Component {}
          )
        ) {
          exportedAppName = declaration.name || declaration.id.name;
        }
      }
    }
  }
}