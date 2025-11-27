const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// 환경변수 로드 - 모드에 따라 적절한 .env 파일 선택
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const envFile = mode === 'production' ? '.env.production' : '.env';

console.log('🔧 Webpack mode:', mode);
console.log('🔧 Loading env file:', envFile);

const env = dotenv.config({ path: envFile }).parsed || {};
console.log('🔧 Loaded env vars:', env);

module.exports = {
  mode,
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.jsx'],
    alias: {
      'react-native$': 'react-native-web',
      '../hooks/useNavigation': '../hooks/useWebNavigation',
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web.html',
      inject: false,
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL || 'http://localhost:3001/api'),
      'process.env.REACT_APP_WS_URL': JSON.stringify(env.REACT_APP_WS_URL || 'http://localhost:3001'),
      'process.env.REACT_APP_KAKAO_CLIENT_ID': JSON.stringify(env.REACT_APP_KAKAO_CLIENT_ID || '5a202bd90ab8dff01348f24cb1c37f3f'),
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      }
    ],
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    devMiddleware: {
      publicPath: '/',
    },
  },
};