import ast
from pathlib import Path

from app.core.file_walker import FileInfo
from app.models.results import DependencyReport, DependencyEdge, DependencyNode

STDLIB_MODULES = frozenset([
    "os", "sys", "re", "json", "math", "io", "abc", "ast", "collections",
    "dataclasses", "datetime", "enum", "functools", "hashlib", "itertools",
    "logging", "pathlib", "pickle", "random", "shutil", "socket", "string",
    "subprocess", "tempfile", "threading", "time", "traceback", "typing",
    "unittest", "urllib", "uuid", "warnings",
])


def analyze_dependencies(files: list[FileInfo], repo_root: Path) -> DependencyReport:
    # Build a set of known internal module IDs for is_external detection
    internal_modules: set[str] = set()
    for fi in files:
        mod_id = _path_to_module_id(fi.rel_path)
        internal_modules.add(mod_id)

    edges: list[DependencyEdge] = []
    node_map: dict[str, DependencyNode] = {}

    for fi in files:
        from_mod = _path_to_module_id(fi.rel_path)
        _ensure_node(node_map, from_mod, fi.rel_path, fi.language, is_external=False)

        try:
            source = fi.path.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source, filename=fi.rel_path)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    to_mod = alias.name.split(".")[0]
                    is_ext = _is_external(to_mod, internal_modules)
                    _ensure_node(node_map, alias.name, None, fi.language, is_external=is_ext)
                    edges.append(DependencyEdge(
                        from_module=from_mod,
                        to_module=alias.name,
                        import_type="import",
                        is_external=is_ext,
                    ))

            elif isinstance(node, ast.ImportFrom):
                if node.module is None:
                    continue
                base = node.module.split(".")[0]
                if node.level and node.level > 0:
                    # Relative import — resolve to sibling module
                    to_mod = _resolve_relative(fi.rel_path, node.module, node.level)
                    is_ext = False
                else:
                    to_mod = node.module
                    is_ext = _is_external(base, internal_modules)
                _ensure_node(node_map, to_mod, None, fi.language, is_external=is_ext)
                edges.append(DependencyEdge(
                    from_module=from_mod,
                    to_module=to_mod,
                    import_type="from_import",
                    is_external=is_ext,
                ))

    # Compute in/out degrees
    for edge in edges:
        if edge.from_module in node_map:
            node_map[edge.from_module].out_degree += 1
        if edge.to_module in node_map:
            node_map[edge.to_module].in_degree += 1

    return DependencyReport(nodes=list(node_map.values()), edges=edges)


def _path_to_module_id(rel_path: str) -> str:
    return rel_path.replace("/", ".").removesuffix(".py")


def _is_external(module_base: str, internal_modules: set[str]) -> bool:
    return module_base not in internal_modules


def _ensure_node(
    node_map: dict, module_id: str, file_path: str | None, language: str, is_external: bool
):
    if module_id not in node_map:
        node_map[module_id] = DependencyNode(
            module_id=module_id,
            file_path=file_path,
            language=language,
            is_external=is_external,
        )


def _resolve_relative(from_rel: str, module: str, level: int) -> str:
    parts = from_rel.split("/")
    # Go up `level` directories
    base_parts = parts[:-(level)]
    if module:
        return ".".join(base_parts + [module])
    return ".".join(base_parts)
