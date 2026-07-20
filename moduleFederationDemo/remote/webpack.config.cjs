const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const packageJson = require("../package.json");

module.exports = (_, argv) => ({
  mode: argv.mode || "development",
  context: __dirname,
  entry: "./src/index.jsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "auto",
    clean: true,
    uniqueName: "productApp"
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "defaults" }],
              ["@babel/preset-react", { runtime: "automatic" }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "productApp",
      filename: "remoteEntry.js",
      exposes: {
        "./ProductCard": "./src/ProductCard.jsx"
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: packageJson.dependencies.react
        },
        "react-dom": {
          singleton: true,
          requiredVersion: packageJson.dependencies["react-dom"]
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html"
    })
  ],
  devServer: {
    port: 3001,
    historyApiFallback: true,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
  devtool: argv.mode === "production" ? "source-map" : "eval-cheap-module-source-map"
});
