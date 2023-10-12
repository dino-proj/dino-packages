// Copyright 2023 dinosdev.cn.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';

import path from 'path';

import tar from 'tar';

import ssri from 'ssri';

import {
  TemplateMeta,
  VersionInfo,
  Versions,
  DistMeta,
  DistTarInfo,
  TemplateDistInfo,
} from './types';

const pckUrlPrefix = 'https://pkg.dinodev.cn';

const tarTemplate = async (
  pType: string,
  tType: string,
  name: string,
  version: string,
  targetDir: string
): Promise<DistTarInfo> => {
  const templateDir = path.join(pType, tType, name, version);
  // 枚举模版目录
  const templateFiles = fs.readdirSync(templateDir);

  // 创建目标目录
  const tarPath = path.join(targetDir, templateDir, `${name}@${version}.tar`);
  fs.mkdirSync(path.join(targetDir, templateDir), { recursive: true });

  // 将模版目录打包为tar，并存放到目标目录
  await tar.create(
    {
      gzip: false,
      file: tarPath,
      cwd: templateDir,
    },
    templateFiles
  );

  // 计算tar文件的shasum, 使用ssri.fromData()方法
  const shasum = ssri.fromData(fs.readFileSync(tarPath), {
    algorithms: ['sha512'],
  });

  return {
    tarball: `${pckUrlPrefix}/${pType}/${tType}/${name}/${version}/${name}@${version}.tar`,
    shasum: shasum.toString(),
  };
};

// 获取目标存放目录参数
const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: bundle [targetDir]');
  process.exit(1);
}

async function buildOneTemplate(
  projectType: string,
  templateType: string,
  name: string,
  meta: TemplateMeta,
  versions: string[]
): Promise<TemplateDistInfo> {
  // 对每个版本进行打包
  const versionInfos: Versions = {};
  for (const versionName of versions) {
    const distTarInfo = await tarTemplate(
      projectType,
      templateType,
      name,
      versionName,
      targetDir
    );

    console.log(distTarInfo);

    const versionInfo: VersionInfo = {
      _id: `${projectType}-${templateType}:${name}@${versionName}`,
      name: name,
      version: versionName,
      publishConfig: {
        access: 'public',
      },
      dist: distTarInfo,
    };
    versionInfos[versionName] = versionInfo;
  }
  return {
    ...meta,
    _id: `${projectType}-${templateType}:${name}`,
    latest: latestVersion(versions),
    versions: versionInfos,
  };
}

async function bundleTemplates(
  projectType: string,
  templateType: string
): Promise<TemplateDistInfo[]> {
  const templateInfos: TemplateDistInfo[] = [];

  // 扫描每个TemplateType下的模版目录
  const templateDirs = fs
    .readdirSync(`./${projectType}/${templateType}`)
    .filter((templateName) =>
      fs
        .statSync(`./${projectType}/${templateType}/${templateName}`)
        .isDirectory()
    );
  for (const templateName of templateDirs) {
    const templateMeta: TemplateMeta = JSON.parse(
      fs
        .readFileSync(
          `./${projectType}/${templateType}/${templateName}/meta.json`
        )
        .toString()
    );
    const versionsDir = `./${projectType}/${templateType}/${templateName}`;
    const versions = fs
      .readdirSync(versionsDir)
      .filter((versionName) =>
        fs.statSync(`${versionsDir}/${versionName}`).isDirectory()
      );

    // build单个模版
    templateInfos.push(
      await buildOneTemplate(
        projectType,
        templateType,
        templateName,
        templateMeta,
        versions
      )
    );
  }

  return templateInfos;
}

async function bundleProjects(): Promise<DistMeta> {
  return {
    lastUpdate: new Date().toISOString(),
    spring: {
      project: await bundleTemplates('spring', 'project'),
      code: await bundleTemplates('spring', 'code'),
    },
    vue3: {
      project: await bundleTemplates('vue3', 'project'),
      code: await bundleTemplates('vue3', 'code'),
    },
  };
}

bundleProjects().then((metas) => {
  // 将meta写入目标目录
  fs.writeFileSync(`${targetDir}/meta.json`, JSON.stringify(metas, null, 2), {
    encoding: 'utf-8',
  });

  // 打印完成信息
  console.log('Bundle completed.');
});
// 计算最新版本

const latestVersion = (versions: string[]): string => {
  const versionNumbers = versions.map((version) => {
    const versionNumber = version.split('.').map((v) => parseInt(v));
    return versionNumber;
  });

  const latestVersionNumber = versionNumbers.reduce((prev, current) => {
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] < current[i]) {
        return current;
      }
    }
    return prev;
  }, versionNumbers[0]);

  return latestVersionNumber.join('.');
};
