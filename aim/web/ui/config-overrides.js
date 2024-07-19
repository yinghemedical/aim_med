const webpack = require('webpack');
const path =require('path')
const WebpackDynamicPublicPathPlugin = require('webpack-dynamic-public-path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  webpack: function (config, webpackEnv) {
    const isEnvProduction = webpackEnv === 'production';

    // Optimization Overrides
    config.optimization.splitChunks = {
      cacheGroups: {
        default: false,
      },
    };
    config.optimization.runtimeChunk = true;

    // Output Overrides.
    if (isEnvProduction) {
      // JS static filenames overrides.
      config.output.filename = 'static/js/[name].js?version=[contenthash]';
      config.output.chunkFilename = 'static/js/[name].js?version=[contenthash]';
    }

    // Plugins Overrides.
    if (isEnvProduction) {
      // CSS static filenames overrides.
      config.plugins.forEach((plugin, index) => {
        if (plugin instanceof MiniCssExtractPlugin) {
          // remove the existing MiniCssExtractPlugin and add new one
          config.plugins.splice(
            index,
            1,
            new MiniCssExtractPlugin({
              filename: 'static/css/[name].css?version=[contenthash]',
              chunkFilename: 'static/css/[name].css?version=[contenthash]',
            }),
          );
        }
      });
    }
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: [
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/VolumeMapper.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/RenderWindow.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/IO/XML/XMLImageDataReader.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/ImageResliceMapper.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/Core/AbstractMapper3D.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Common/DataModel/BoundingBox.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/ImageMapper.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Common/Core/DataArray.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/ImageCPRMapper.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/Core/ScalarBarActor.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/Core/RenderWindowInteractor.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/macros2.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/WebGPU/RenderEncoder.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/Texture.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Interaction/Manipulators/MouseBoxSelectorManipulator.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/Core/CubeAxesActor.js'),
        path.resolve(__dirname, 'node_modules/@kitware/vtk.js/Rendering/OpenGL/PolyDataMapper.js'),
        path.resolve(__dirname, 'node_modules/@pmmmwh/react-refresh-webpack-plugin/loader/index.js')
      ],
      exclude: /node_modules\/(?!(@kitware\/vtk\.js|@pmmmwh\/react-refresh-webpack-plugin)).*/,
      use: {
        loader: 'babel-loader',
        options: {
          
        }
      }
    });
    // Add external variable for base path support.
    config.plugins.push(
      new WebpackDynamicPublicPathPlugin({
        externalPublicPath: 'window.externalPublicPath',
      }),
    );

    config.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: !isEnvProduction,
      }),
    );
    return config;
  },
};
