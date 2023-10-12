// Copyright 2023 dinosdev.cn.
// SPDX-License-Identifier: Apache-2.0

export type ProjectTypes = 'spring' | 'vue3';

export type TemplateTypes = 'project' | 'code';

export interface TemplateMeta {
  _id: string;
  name: string;
  description: string;
  license: string;
  author: {
    name: string;
    email: string;
  };
}

export interface DistTarInfo {
  tarball: string;
  shasum: string;
}

export interface VersionInfo {
  _id: string;
  name: string;
  version: string;
  publishConfig: {
    access: 'public' | 'private';
  };
  dist: DistTarInfo;
}

export interface Versions {
  [version: string]: VersionInfo;
}

export type TemplateDistInfo = TemplateMeta & {
  latest: string;
  versions: Versions;
};

export type DistMeta = {
  [key in ProjectTypes]: {
    [key in TemplateTypes]: TemplateDistInfo[];
  };
} & {
  lastUpdate: string;
};
