# Based on https://stackoverflow.com/questions/71026245/how-to-add-custom-pylint-warning

from typing import TYPE_CHECKING

from astroid import nodes

from pylint.checkers import BaseChecker
from pylint.checkers.utils import check_messages

if TYPE_CHECKING:
    from pylint.lint import PyLinter

# TODO the CI can't seem to see this file (or its parent directory? so it currently only runs locally in the editor)

class PrintUsedChecker(BaseChecker):

    name = "no_print_allowed"
    msgs = {
        "C9001": (
            "GLADOS: Used `print` statement, use the correct logger instead",
            "glados-print-used",
            "Messages that are printed aren't available in the system"
            "logs nor to system users. Use the logging system.",
        )
    }

    @check_messages("glados-print-used")
    def visit_call(self, node: nodes.Call) -> None:
        if isinstance(node.func, nodes.Name):
            if node.func.name == "print":
                self.add_message("glados-print-used", node=node)


def register(linter: "PyLinter") -> None:
    linter.register_checker(PrintUsedChecker(linter))